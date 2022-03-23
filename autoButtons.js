/* globals log, on, playerIsGM, state, sendChat */ //eslint-disable-line

const autoButtons = (() => { //eslint-disable-line no-unused-vars	

	const scriptName = 'autoButtons';

	const config = {
		version: {
			M: 0,
			m: 4,
			p: 5,
			get: function() { return `${this.M}.${this.m}.${this.p}` },
			getFloat: function() { return parseFloat(`${this.M}.${this.m}${this.p}`) }
		},
		settings: {
			sheet: 'dnd5e_r20',
			templates: {},
			enabledButtons: [],
			gmOnly: 1,
			hpBar: 1,
			ignoreAPI: 1,
			overheal: 0,
			overkill: 0
		},
		fetchFromState: function() { Object.assign(this.settings, state[scriptName].settings); },
		saveToState: function() { Object.assign(state[scriptName].settings, this.settings); },
		// Provide path relative to {config.settings}, e.g. changeSetting('sheet', 'mySheet');
		// supply newValue as 'toggle' to toggle a 1/0 switch
		changeSetting: function(pathString, newValue, pathOptions = { baseObject: config.settings, createPath: false }) {
			if (typeof(pathString) !== 'string' || newValue === undefined) return;
			let keyName = (pathString.match(/[^/]+$/)||[])[0],
					path = /.+\/.+/.test(pathString) ? pathString.match(/(.+)\/[^/]+$/)[1] : '';
			let configPath = path ? h.getObjectPath(path, pathOptions.baseObject, pathOptions.createPath) : config.settings;
			if (configPath && keyName) {
				if (/^toggle$/i.test(newValue)) { // toggle 1/0
					const oldVal = parseInt(this.getSetting(pathString));
					if (oldVal !== 0 && oldVal !== 1) {
						h.toChat(`Setting "${pathString}" could not be toggled: current value is "${oldVal}"`);
						return 0;
					}
					newValue = (1 - oldVal);
				}
				configPath[keyName] = newValue;
				this.saveToState();
				return 1;
			} else {
				log(`${scriptName}: bad config path ${pathString}`);
				return 0;
			}
		},
		getSetting: function(pathString) {
			if (typeof(pathString) !== 'string') return null;
			let configValue = h.getObjectPath(pathString);
			return (typeof configValue === 'object') ? JSON.parse(JSON.stringify(configValue)) : configValue;
		},
		loadPreset: function() {
			const currentSheet = this.settings.sheet;
			if (Object.keys(preset).includes(currentSheet)) {
				this.settings.templates = preset[currentSheet].templates || [];
				this.settings.enabledButtons = preset[currentSheet].defaultButtons || [];
				h.toChat(`Loaded preset: ${config.getSetting('sheet')}`);
				this.saveToState();
				return 1;
			} else return 0;
		}
	};

	const initScript = () => {
		setTimeout(() => { if (!/object/i.test(typeof(['token-mod']))) return sendChat(scriptName, `/w gm <div style="${styles.error}">tokenMod not found - this script requires tokenMod to function! Aborting init...</div>`), 500 });
		if (!state[scriptName] || !state[scriptName].version) {
			log(`autoButtons: first time setup...`);
			state[scriptName] = {
				version: config.version.getFloat(),
				settings: config.settings,
			}
		} else if (state[scriptName].version < config.version.getFloat()) {
			let v = state[scriptName].version;
			if (v < 0.13) {
				Object.assign(state[scriptName].settings, { ignoreAPI: 1 }); // new config key
			}
			if (v < 0.20) {
				Object.assign(state[scriptName].settings, { overkill: 0, overheal: 0, enabledButtons: [] }); // new config keys
			}
			if (v < 0.30) {
				config.loadPreset(); // structure of preset has changed - reload
			}
			if (v < 0.40) {
				state[scriptName].customButtons = {}; // new button store
			}
			state[scriptName].version = config.version.getFloat();
			log(`***UPDATED*** ====> ${scriptName} to v${config.version.get()}`);
		}
		config.fetchFromState();
		if (
			(!config.getSetting('templates/names') || !config.getSetting('templates/names').length)
			|| (!config.getSetting('enabledButtons') || !config.getSetting('enabledButtons').length)) {
				config.loadPreset();
				h.toChat(`Error fetching config - loaded preset defaults`);
		}
		// Check state of buttons, repair if needed
		state[scriptName].customButtons = state[scriptName].customButtons || {};
		for (let button in state[scriptName].customButtons) {
			// log(state[scriptName].customButtons[button]);
			buttons[button] = buttons[button] || state[scriptName].customButtons[button];
			buttons[button].math = customButton.parseActionString(state[scriptName].customButtons[button].mathString||'');
			// log(buttons[button]);
		}
		const allButtons = buttons.getNames(),
			enabledButtons = config.getSetting('enabledButtons'),
			validButtons = enabledButtons.filter(v => allButtons.includes(v));
		if (validButtons.length !== enabledButtons.length) config.changeSetting('enabledButtons', validButtons);
		on('chat:message', handleInput);
		log(`- Initialised ${scriptName} - v${config.version.get()} -`);
		// log(state[scriptName]);
	}

	// Setting up a sheet:
	// Follow the pattern for the 5e sheet -
	//  names: array of the roll template property names to watch in chat and respond to with buttons
	//  damageProperties: core damage function expects and array for 'damage' and 'crit', but either can be empty if not relevant.
	//  other arrays can be created, but will need custom code in the handleDamageRoll() function to do anything with them
	//  All roll template property names entered into the 'damage' and 'crit' arrays will be available in button math, math: (d,c) => {}
	// 
	// defaultButtons: the default buttons to show in the button template
	const preset = {
		dnd5e_r20: {
			templates: {
				names: ['atkdmg', 'dmg', 'npcfullatk', 'npcdmg'],
				damageProperties: {
					damage: ['dmg1', 'dmg2', 'globaldamage'],
					crit: ['crit1', 'crit2', 'globaldamagecrit'],
					upcastDamage: ['hldmg'],
					upcastCrit: ['hldmgcrit'],
				}
			},
			defaultButtons: ['damageCrit', 'damageFull', 'damageHalf', 'healingFull'],
		},
		custom: {
			templates: {
				names: [],
				damageProperties: {
					damage: [],
					crit: [],
				}
			},
			defaultButtons: []
		}
	}

	const styles = {
		error: `color: red; font-weight: bold;`,
		outer: `position: relative; vertical-align: middle; font-family: pictos; display: block; background: #f4e6b6; border: 1px solid black; height: auto; line-height: 34px; text-align: center; border-radius: 2px;`,
		rollName: `font-family: arial; font-size: 1.1rem; color: black; font-style:italic; position:relative; overflow: hidden; display: block; line-height: 1rem; margin: 2px 0px 1px 0px; white-space: nowrap; text-align: left; left: 2px;`,
		buttonContainer: `display: inline-block; text-align: center; vertical-align: middle; line-height: 26px; margin: auto 5px auto 5px; height: 26px;	width: 26px; border: #8c6700 1px solid;	box-shadow: 0px 0px 3px #805200; border-radius: 5px; background-color: whitesmoke;`,
		buttonShared: `background-color: transparent;	border: none;	padding: 0px;	width: 100%; height: 100%; overflow: hidden;	white-space: nowrap;`,
		crit: `color: red; font-size: 1.5rem;`,
		full: `color: darkred; font-size: 2.1rem;`,
		half: `color: black; font-family: pictos three; font-size: 2rem; padding-top:1px;`,
		healFull: `color: green; font-size: 2rem;`,
		list: {
			container: `background: #626161; border: solid 2px darkgrey; color: white; vertical-align: middle;`,
			header: `text-align: center; font-weight: bold; padding: 6px 0px 6px 0px; border-bottom: solid 1px darkgrey; line-height: 1.5em;`,
			body: `padding: 8px 0px 8px 0px; border-bottom: solid 1px darkgrey;`,
			row: `vertical-align: middle; margin: 0.2em auto 0.2em auto; font-size: 1.2em; line-height: 1.4em;`,
			name: `display: inline-block; vertical-align: middle;	width: 60%; margin-left: 5%; overflow-x: hidden;`,
			buttonContainer: `	display: inline-block; vertical-align: middle; width: 10%; text-align: center; line-height: 1.2em;`,
			controls: {
				common: `position: relative; font-family: pictos; display: inline-block; background-color: darkgray; padding: 0px; margin: 0px; border: 1px solid #c2c2c2; border-radius: 3px; width: 1.1em; height: 1.1em; line-height: 1.1em; font-size: 1.2em;`,
				show: `color: #03650b;`,
				hide: `color: #2a2a2a;`,
				disabled: `color: gray; cursor: pointer;`,
				delete: `color: darkred;`,
				create: `display: inline-block; background-color: darkgray; padding: 0px; margin: 0px; border: 1px solid #c2c2c2; border-radius: 3px;	color: #066a66; padding: 2px 5px 2px 5px;`,
				no: `position: absolute; left: 0.4em; font-weight: bold; font-family: arial;`
			},
			footer: `text-align: center; font-weight: bold; padding: 6px 0px 6px 0px; border-bottom: solid 1px darkgrey; line-height: 1.5em;`
		}
	}

	class customButton {
		constructor(data={}) {
			if (data.math) {
				this.mathString = data.math;
				if (typeof data.math === 'string') data.math = customButton.parseActionString(data.mathString || data.math);
				if (typeof data.math !== 'function') return null;
			} else return null;
			Object.assign(this, {
				sheets: data.sheets ? h.toArray(data.sheets.split(/\s*,\s*/g)) : [],
				tooltip: `${data.tooltip || ''}`,
				style: styles[data.style] || data.style || styles.full,
				content: `${data.content || 'k'}`,
				math: data.math,
				default: false,
			});
			// log(this);
		}
		static parseActionString(inputString) {
			// Convert to JS
			const formulaReplacer = {
				'$1Math.floor': /([^.]|^)floor/ig,
				'$1Math.ceil': /([^.]|^)ceil/ig,
				'$1Math.round': /([^.]|^)round/ig,
				'($1||0)': /((damage|crit)\.\w+)/ig,
			}
			let newFormula = inputString;
			for (let f in formulaReplacer) newFormula = newFormula.replace(formulaReplacer[f], f);

			// Create a test object
			let damageKeys = inputString.match(/(damage|crit)\.(\w+)/g),
				testKeys = {};
			damageKeys = damageKeys ? damageKeys.map(k => k.replace(/^[^.]*\./, '')) : [];
			damageKeys.forEach(k => testKeys[k] = 5);

			let validate = false,
				newFunc;
			try {
				newFunc = new Function(`damage`, `crit`, `return (${newFormula})`)
				validate = isNaN(newFunc(testKeys, testKeys)) ? false : true;
			} catch(e) { log(`${scriptName}: formula failed validation`) }

			if (validate) {
				return newFunc;
			}	else {
				log(`Failed to create function: syntax error, or function does not return a number: ${inputString}`);
				return null;
			}
		}
	}

	
	// Setting up buttons manually:
	// name - any valid javascript object key. Will be used with the CLI to add and remove the button from the script output
	//	sheets - array of sheets this button will function with
	// 	tooltip - mouseover tooltip, % will be replaced with the calculated numerical value
	// 	style - link to a style in the styles: {} object above, or write a new one
	//  math - receives two arguments, damage and crit. Both are objects containing a key for each template property, and one for total
	//			e.g. damage = { dmg1: 5, dmg2: 7, globaldamage: 0, total: 12 }	//			
	//	content - the label on the button. Pre-built buttons are all using pictos font
	const buttonKeyNames = ['sheets', 'content', 'tooltip', 'style', 'math', 'default', 'mathString'];
	const buttons = {
		// Default buttons used by presets
		damageCrit: {
			sheets: ['dnd5e_r20'],
			tooltip: `Crit (%)`,
			style: styles.crit,
			math: (d,c) => -(1 * c.total),
			content: 'kk',
			default: true,
		},
		damageFull: {
			sheets: ['dnd5e_r20'],
			tooltip: `Full (%)`,
			style: styles.full,
			math: (d) => -(1 * d.total),
			content: 'k',
			default: true,
		},
		damageHalf: {
			sheets: ['dnd5e_r20'],
			tooltip: `Half (%)`,
			style: styles.half,
			math: (d) => -(Math.floor(0.5 * d.total)),
			content: 'b',
			default: true,
		},
		healingFull: {
			sheets: ['dnd5e_r20'],
			tooltip: `Heal (%)`,
			style: styles.healFull,
			math: (d) => (1 * d.total),
			content: '&',
			default: true,
		},
		createApiButton: function(buttonName, damage, crit) {
			const btn = this[buttonName],
				bar = config.getSetting('hpBar'),
				overheal = config.getSetting('overheal'),
				overkill = config.getSetting('overkill');
			if (!btn || typeof(btn.math) !== 'function') {
				log(`${scriptName}: error creating API button ${buttonName}`);
				log(btn.math||'No function found');
				return ``;
			}
			const modifier = btn.math(damage, crit),
			tooltip = btn.tooltip.replace(/%/, `${modifier} HP`),
				tokenModCmd = (modifier > 0) ? (!overheal) ? `+${modifier}!` : `+${modifier}` : (modifier < 0 && !overkill) ? `${modifier}!` : modifier;
			return `<div style="${styles.buttonContainer}"  title="${tooltip}"><a href="!token-mod --set bar${bar}_value|${tokenModCmd}" style="${styles.buttonShared}${btn.style}">${btn.content}</a></div>`;
		},
		getNames: function(includeDefault=true) { return Object.entries(this).map(e => { if (typeof(e[1]) !== 'function' && (includeDefault || !e[1].default)) return e[0] }).filter(v=>v);	},
		validateButtons: function(buttons) { // Supply button(s) to validate, or supply no parameter to check all currently-shown buttons
			const currentSheet = config.getSetting('sheet'),
				buttonsToValidate = buttons ? h.toArray(buttons) : config.getSetting('enabledButtons');
			return buttonsToValidate.filter(b => this[b] && (currentSheet === 'custom' || this[b].sheets.length < 1 || this[b].sheets.includes(currentSheet)))
		},
		editButton: function(buttonName, buttonData, isNew) { // supply false as buttonData to delete
			let err;
			if (this[buttonName] && this[buttonName].default) return { res: 0, err: `Cannot modify default buttons` }
			if (buttonData) {
				if (isNew && this[buttonName]) err = `Button "${buttonName}" already exists, aborting.`;
				else if (!isNew && !this[buttonName]) err = `Cannot edit button "${buttonName}", button not found.`;
				else {
					if (isNew) buttons[buttonName] = {};
					for (let kv in buttonData) { if (buttonKeyNames.includes(kv)) buttons[buttonName][kv] = buttonData[kv] }
					this.saveToState();
				}
			} else if (buttonData === false) {
				if (!buttons[buttonName]) err = `Cannot delete button "${buttonName}", button not found.`;
				else {
					const stores = [state[scriptName].customButtons, buttons];
					stores.forEach(store => {
						if (store[buttonName]) {
							store[buttonName] = null;
							delete store[buttonName];
						}
					});
				}
			} else err = `Unknown data supplied.`;
			return err ? { res: 0, err: err } : { res: 1 }
		},
		saveToState: function() {
			const customButtonNames = this.getNames(false);
			// log(`Saving ${customButtonNames.join(', ')}`)
			customButtonNames.forEach(v => {
				state[scriptName].customButtons[v] = buttons[v];
			});
		}
	}

	const rx = { on: /\b(1|true|on)\b/i, off: /\b(0|false|off)\b/i };

	const sendButtons = (damage, crit, msg) => {
		let gmo = config.getSetting('gmOnly') ? true : false;
		let buttonHtml = '',
			activeButtons = config.getSetting(`enabledButtons`) || [],
			name = h.findName(msg.content);
		name = name || `Apply:`;
		activeButtons.forEach(btn => buttonHtml += buttons.createApiButton(btn, damage, crit));
		const buttonTemplate = `<div class="autobutton" style="${styles.outer}"><div style="${styles.rollName}">${name}</div>${buttonHtml}</div>`;
		h.toChat(`${buttonTemplate}`, gmo);
	}

	const handleDamageRoll = (msg) => {
		const dmgFields = config.getSetting('templates/damageProperties/damage')||[],
			critFields = config.getSetting('templates/damageProperties/crit')||[];
		const damage = h.processFields(dmgFields, msg),
			crit = h.processFields(critFields, msg);
		if ('dnd5e_r20' === config.getSetting('sheet')) {
			const isSpell = h5e.is5eAttackSpell(msg.content);
			if (isSpell) {
				const upcastDamageFields = config.getSetting('templates/damageProperties/upcastDamage')||[],
					upcastCritFields = config.getSetting('templates/damageProperties/upcastCrit')||[];
				damage.total += h.processFields(upcastDamageFields, msg).total||0;
				crit.total += h.processFields(upcastCritFields, msg).total||0;
			}
		}
		crit.total += damage.total;
		sendButtons(damage, crit, msg);
	}

	const handleInput = (msg) => {
		const msgIsGM = playerIsGM(msg.playerid);
		if (msg.type === 'api' && msgIsGM && /^!(autobut)/i.test(msg.content)) {
			let cmdLine = (msg.content.match(/^![^\s]+\s+(.+)/i) || [])[1],
					params = cmdLine ? cmdLine.split(/\s*--\s*/g) : [];
			params.shift();
			params = params.length ? params : [''];
			params.forEach(param => {
				let cmd = (param.match(/^([^\s]+)/)||[])[1],
					args = (param.match(/\s+(.+)/)||['',''])[1],
					changed = [];
				if (!cmd) return;
				for (let opt in CLI.options) { if (CLI.options[opt].rx && CLI.options[opt].rx.test(cmd)) changed.push(CLI.options[opt].action(args)) }
				if (changed.filter(v=>v).length) h.toChat(`*Settings change result:*<br>${changed.join('<br>')}`);
			});
		}
		else if (msg.rolltemplate && config.getSetting('templates/names').includes(msg.rolltemplate)) {
			const ignoreAPI = config.getSetting('ignoreAPI');
			if (ignoreAPI && /^api$/i.test(msg.playerid)) return;
			handleDamageRoll(msg);
		}
	}

	// Command line interface data
	const CLI = {
		options: {
			reset: {
				rx: /^reset/i,
				description: `Reset configuration from preset`,
				action: () => {
					if (config.getSetting('sheet')) {
						config.loadPreset();
						return `Config reset from preset: "${config.getSetting('sheet')}"`;
					} else h.toChat(`No preset found!`);
				}
			},
			bar: {
				rx: /^(hp)?bar/i,
				description: `Select which token bar represents hit points`,
				action: (args) => {
					const newVal = parseInt(`${args}`.replace(/\D/g, ''));
					if (newVal > 0 && newVal < 4) {
						if (config.changeSetting('hpBar', newVal)) return `hpBar: ${newVal}`;
					}
				}
			},
			loadPreset: {
				rx: /^loadpre/i,
				description: `Select a preset for a Game System`,
				action: (args) => {
					const newVal = args.trim();
					if (Object.keys(preset).includes(newVal)) {
						if (config.changeSetting('sheet', newVal)) {
							config.loadPreset();
							buttons.validateButtons();
							return `Preset changed: ${newVal}`;
						} else h.toChat(`${scriptName}: error changing preset to "${newVal}"`);
					}
				}
			},
			listTemplates: {
				rx: /^(list)?templ/i,
				description: `List roll templates the script is listening for`,
				action: () => {
					const templates = config.getSetting(`templates/names`),
						templateText = `{{&nbsp;${templates.join(', ')}}}`,
						chatText = `&{template:default} {{name=Trigger Templates}} ${templateText}`;
					h.toChat(chatText);
				}
			},
			addTemplate: {
				rx: /^addtem/i,
				description: `Add roll template name to listen list for damage rolls`,
				action: (args) => CLI.helpers.modifyConfigArray(args, 'templates/names')
			},
			removeTemplate: {
				rx: /^rem(ove)?tem/i,
				description: `Remove roll template from listen list`,
				action: (args) => CLI.helpers.modifyConfigArray(args, 'templates/names', 0)
			},
			listProperties: {
				rx: /^(list)?(propert|props)/i,
				description: `List roll template properties inline rolls are grabbed from`,
				action: () => {
					const properties = config.getSetting('templates/damageProperties');
					let templateText = ``;
					if (typeof properties === 'object') {
						for (let category in properties) templateText += `{{&nbsp;${category}=${properties[category].join(`, `)}}}`
					} else return log(`${scriptName}: Error getting damage properties from state`);
					const chatOutput = `&{template:default} {{name=Roll Template Properties}} ${templateText}`;
					h.toChat(chatOutput);
				}
			},
			addProperty: {
				rx: /^addprop/i,
				description: `Add a roll template property to the listener`,
				action: (args) => {
					const parts = args.match(/([^/]+)\/(.+)/);
					if (parts && parts.length === 3) {
						if (config.getSetting(`templates/damageProperties/${parts[1]}`) == null) {
							h.toChat(`Created new roll template damage property category: ${parts[1]}`);
							state[scriptName].settings.templates.damageProperties[parts[1]] = [];
						}
						CLI.helpers.modifyConfigArray(parts[2], `templates/damageProperties/${parts[1]}`);
					} else {
						h.toChat(`Bad property path supplied, must be in the form "category/propertyName". Example: damage/dmg1`);
					}
				}
			},
			removeProperty: {
				rx: /^rem(ove)?prop/i,
				description: `Remove a roll template property from the listener`,
				action: (args) => {
					const parts = args.match(/([^/]+)\/(.+)/);
					if (parts && parts.length === 3) {
						const currentArray = config.getSetting(`templates/damageProperties/${parts[1]}`);
						if (currentArray != null) {
							const removed = CLI.helpers.modifyConfigArray(parts[2], `templates/damageProperties/${parts[1]}`, 0);
							if (removed && !/^(damage|crit)$/i.test(parts[1])) { // Clean up category if it's now empty, and isn't a core category
								const newArray = config.getSetting(`templates/damageProperties/${parts[1]}`);
								if (newArray.length === 0) delete state[scriptName].settings.templates.damageProperties[parts[1]];
							}
						} else h.toChat(`Could not find roll template property category: ${parts[1]}`);
					} else {
						h.toChat(`Bad property path supplied, must be in the form "category/propertyName". Example: damage/dmg1`);
					}
				}
			},
			listButtons:{
				rx: /^(list)?button/i,
				description: `List available buttons`,
				action: () => {
					const allButtons = buttons.getNames(),
						removableButtons = buttons.getNames(false),
						usedButtons = config.getSetting('enabledButtons'),
						unusedButtons = allButtons.filter(v => !usedButtons.includes(v)),
						availableButtons = buttons.validateButtons(unusedButtons),
						reorderedButtons = usedButtons.concat(unusedButtons);
					const links = {
						hide: `!autoButton --hideButton %name%`,
						show: `!autoButton --showButton %name%`,
						delete: `!autoButton --deleteButton %name%`,
						disabled: `#`
					}
					const labels = { hide: `E<span style="${styles.list.controls.no}">/</span>`, show: 'E', delete: 'D', disabled: '!' };
					const controls = ['show', 'hide', 'delete'];
					const listBody = reorderedButtons.map(button => {
						let rowHtml = `<div class="list-row" style="${styles.list.row}"><div class="button-name" style="${styles.list.name}">${removableButtons.includes(button) ? '' : '&ast;'}%name%</div>`;
						controls.forEach(control => {
							const controlType = (
								(control === 'show' && availableButtons.includes(button)) || 
								(control === 'hide' && usedButtons.includes(button)) ||
								(control === 'delete' && removableButtons.includes(button)))
								? control : 'disabled';
							rowHtml += `<div class="control-${control}" style="${styles.list.buttonContainer}" title="${h.emproper(`${control} button`)}"><a href="${links[controlType]}" style="${styles.list.controls.common}${styles.list.controls[controlType]}">${labels[control]}</a></div>`;
						});
						return `${rowHtml.replace(/%name%/g, button)}</div>`;
					});
					const fullTemplate = `
						<div class="autobutton-list" style="${styles.list.container}">
							<div class="autobutton-header" style="${styles.list.header}">autoButton list (sheet: ${config.getSetting('sheet')})</div>
							<div class="autobutton-body" style="${styles.list.body}">
								${listBody.join('')}
							</div>
							<div class="autobutton-footer" style="${styles.list.footer}">
								<div style="${styles.list.buttonContainer}width:auto;"><a style="${styles.list.controls.create}" href="!autobut --createbutton {{name=?{Name?|newButton}}} {{content=?{Pictos Character?|k}}} {{tooltip=?{Tooltip?|This is a button}}} {{math=?{Math function|floor(damage.total/2&rpar;}}}">Create New Button</a></div>
							</div>
						</div>
						`;
					h.toChat(`/w gm ${fullTemplate.replace(/\n/g, '')}`, false);
				},
			},
			showButton: {
				rx: /^showbut/i,
				description: `Add a button to the template`,
				action: (args) => {
					const newVal = args.trim();
					if (buttons.validateButtons(newVal).length) {
						let oldVal = config.getSetting('enabledButtons');
						if (!oldVal.includes(newVal)) {
							oldVal.push(newVal);
							config.changeSetting('enabledButtons', oldVal);
							return `Button "${newVal}" is now visible.`;
						} else h.toChat(`Button "${newVal}" already exists.`)
					} else h.toChat(`Unrecognised or incompatible button: "${newVal}"`);
				}
			},
			hideButton: {
				rx: /^hidebut/i,
				description: `Remove a button from the template`,
				action: (args) => {
					const newVal = args.trim(),
					oldVal = config.getSetting('enabledButtons');
					if (oldVal.length && oldVal.includes(newVal)) {
						const filtered = oldVal.filter(v=> v !== newVal);
						config.changeSetting('enabledButtons', filtered);
						return `Button "${newVal}" is hidden.`;
					} else log(`${scriptName}: unrecognised button name`);
				}
			},
			reorderButtons: {
				rx: /^(re)?order/i,
				description: `Change order of buttons`,
				action: (args) => {
					if (!args) return;
					const newIndices = args.replace(/[^\d,]/g, '').split(/,/g),
						currentOrder = config.getSetting('enabledButtons');
					let newOrder = [];
					let valid = true;
					newIndices.forEach(buttonIndex => {
						const realIndex = buttonIndex - 1;
						if (realIndex > -1 && realIndex < currentOrder.length) {
							if (currentOrder[realIndex]) {
								newOrder.push(currentOrder[realIndex]);
								currentOrder[realIndex] = null;
							}
						} else valid = false;
					});
					if (!valid) return h.toChat(`Invalid button order input: ${args}. Indices must be between 1 and total number of buttons in use.`);
					newOrder = newOrder.concat(currentOrder.filter(v=>v));
					if ((newOrder.length === currentOrder.length) && config.changeSetting('enabledButtons', newOrder)) return `Button order changed to: [ ${newOrder.join(' | ')} ]`;
				}
			},
			createButton: {
				rx: /^createbut/i,
				description: `Create a new button`,
				action: (args) => {
					const buttonData = CLI.helpers.splitHandlebars(args);
					if (buttonData && buttonData.name) {
						if (/^[^A-Za-z]/.test(buttonData.name)) return `Invalid button name: must start with a letter`;
						let buttonName = /\s/.test(buttonData.name) ? CLI.helpers.camelise(buttonData.name) : buttonData.name;
						if (buttons.getNames().includes(buttonName)) return `Invalid button name, already in use: "${buttonName}"`;
						if (!buttonData.math) return `Button must have an associated function, {{math=...}}`;
						const newButton = new customButton(buttonData);
						if (newButton && newButton.math) {
							const { res, err } = buttons.editButton(buttonName, newButton, 1);
							if (res) return `Successfully added button "${buttonName}"`;
							else return `Failed to create button "${buttonName}" - ${err}`;
						}
					} else return `Bad input for button creation`
				}
			},
			editButton: {
				rx: /^editbut/i,
				description: `Edit an existing button`,
				action: (args) => {
					let buttonData = CLI.helpers.splitHandlebars(args);
					// log(buttonData);
					if (buttonData && buttonData.name) {
						const buttonName = /\s/.test(buttonData.name) ? CLI.helpers.camelise(buttonData.name) : buttonData.name;
						if (buttonData.math) {
							buttonData.mathString = buttonData.math;
							let newFunc = customButton.parseActionString(buttonData.math);
							// log(newFunc.toString());
							buttonData.math = newFunc;
						}
						if (buttonData.math === null) return `Bad math function supplied in edit.`;
						// log(buttonData);
						const { res, err } = buttons.editButton(buttonName, buttonData)
						if (res) return `Successfully edited button "${buttonName}"`;
						else return `Failed to save edits to button "${buttonName}" - ${err}`;
					}
				}
			},
			deleteButton: {
				rx: /^del(ete)?but/i,
				description: `Remove a button`,
				action: (args) => {
					const { res, err } = buttons.editButton(args, false);
					if (res) {
						CLI.helpers.modifyConfigArray(args, 'enabledButtons', 0);
						return `Successfully deleted button ${args}`;
					} else return `Couldn't delete button ${args} - ${err}`;
				}
			},
			ignoreApi: {
				rx: /^ignoreapi/i,
				description: `Ignore anything sent to chat by the API`,
				action: (args) => CLI.helpers.toggle('ignoreAPI', args)
			},
			overheal: {
				rx: /^overh/i,
				description: `Allow healing to push hp above hpMax`,
				action: (args) => CLI.helpers.toggle('overheal', args)
			},
			overkill: {
				rx: /^overk/i,
				description: `Allow healing to push hp above hpMax`,
				action: (args) => CLI.helpers.toggle('overkill', args)
			},
			gmOnly: {
				rx: /^gmo/i,
				description: `Whisper the buttons to GM, or post publicly`,
				action: (args) => CLI.helpers.toggle('gmOnly', args)
			},
			settings: {
				rx: /^setting/i,
				description: `Open settings UI`,
				action: () => h.toChat(`Not yet implemented.`)
			},
			help: {
				rx: /^(\?$|h$|help)/i,
				description: `Display script help`,
				action: () => showHelp()
			},
			uninstall: {
				rx: /^uninstall$/i,
				description: `Remove all script settings from API state`,
				action: () => {
					state[scriptName] = null;
					delete state[scriptName];
					h.toChat(`Removed all ${scriptName} settings from API state.`)
				}
			}
		},
		helpers: {
			toggle: (settingPath, args) => {
				if (!settingPath) return log(`autoButton config error, bad settings change: ${settingPath}`);
				const newVal = !args ? 'toggle' : rx.off.test(args) ? 0 : rx.on.test(args) ? 1 : null;
				if (newVal != null && config.changeSetting(settingPath, newVal)) return `${settingPath} set to "${rx.on.test(config.getSetting(settingPath)) ? 'on' : 'off'}"`;
				else h.toChat(`Failed to set ${settingPath}: "${args}"`);
			},
			// supply falsy 'addOrSub' value for subtract, default is add. Supply a validation function if required.
			modifyConfigArray: (value, targetSettingPath, addOrSub = 1, validation = (v) => v, allowDuplicates = false) => { 
				if (value == null || !targetSettingPath || addOrSub == null) return log(`${scriptName}: Error modifying template, bad arguments.`);
				const currentSetting = config.getSetting(targetSettingPath);
				if (!Array.isArray(currentSetting)) return log(`${scriptName}: bad setting path supplied to config "${targetSettingPath}", or target is not an Array.`);
				let newSetting = [];
				if (addOrSub) {
					if (validation(value)) {
						if (allowDuplicates || !currentSetting.includes(value)) newSetting = currentSetting.concat([value]);
						else return `Value "${value}" already exists in "${targetSettingPath}"`;
					}
				} else {
					if (currentSetting.includes(value)) newSetting = currentSetting.filter(v => v !== value);
					else return `Value "${value}" does not exist in "${targetSettingPath}"`;
				}
				if (config.changeSetting(targetSettingPath, newSetting)) {
					h.toChat(`"${value}" added to setting "${targetSettingPath}"`);
					return true;
				}
			},
			splitHandlebars: (inputString) => {
				let output = {},
					kvArray = inputString.match(/{{[^}]+}}/g)||[];
				kvArray.forEach(kv => {
					kv = kv.replace(/({{|}})/g, '');
					const key = kv.match(/^[^=]+/),
						value = (kv.match(/=(.+)/)||[])[1] || ``;
					if (key) output[key] = value;
				});
				return Object.keys(output).length ? output : null;
			},
			camelise: (inp, options={enforceCase:false}) => {
				if (typeof(inp) !== 'string') return null;
				const words = inp.split(/[\s_]+/g);
				return words.map((w,i) => {
					const wPre = i > 0 ? w[0].toUpperCase() : w[0].toLowerCase();
					const wSuf = options.enforceCase ? w.slice(1).toLowerCase() : w.slice(1);
					return `${wPre}${wSuf}`;
				}).join('');
			}
		}
	}

	const showHelp = () => h.toChat(`Haaaaalp! ... (Not yet implemented)`);
	
	// Helper functions
	const h = (() => { 
		const processFields = (fieldArray, msg) => {
			let output = {}
			const rolls = msg.inlinerolls;
			output.total = fieldArray.reduce((m, v) => {
				const rxIndex = new RegExp(`{${v}=\\$\\[\\[\\d+`, 'g'),
					indexResult = msg.content.match(rxIndex);
				if (indexResult) {
					const index = indexResult.pop().match(/\d+$/)[0],
						total = isNaN(rolls[index].results.total) ? 0 : rolls[index].results.total;
					output[v] = total;
					return m + total;
				} else { // if roll template property's inline roll is not found, return 0 to prevent errors down the line
					output[v] = 0;
				}
				return m;
			}, 0);
			return output;
		}

		const findName = (msgContent) => {
			const rxName = /name=([^}]+)}/i;
			let name = msgContent.match(rxName);
			return name ? name[1] : null;
		}
	
		const getObjectPath = (pathString, baseObject = config.settings, createPath=false) => {
			let parts = pathString.split(/\/+/g);
			let objRef = parts.reduce((m,v) => {
				if (m == null) return;
				if (m[v] == null) {
					if (createPath) m[v] = {};
					else return null;
				}
				return m[v];}, baseObject)
			return objRef;
		}
		const toChat = (msg, whisper = true) => {
			let prefix = whisper ? `/w gm ` : '';
			sendChat(scriptName, `${prefix}${msg}`, {noarchive: true});
		}
		const toArray = (inp) => Array.isArray(inp) ? inp : [inp];
		const emproper = (inpString) => {
			let words = inpString.split(/\s+/g);
			return words.map(w => `${w[0].toUpperCase()}${w.slice(1)}`).join(` `);
		}

		return { processFields, findName, getObjectPath, toChat, toArray, emproper }
	})();
	
	// 5e helpers
	const h5e = (() => {
		const is5eAttackSpell = (msgContent) => {
			const rxSpell = /{spelllevel=(cantrip|\d+)/;
			return rxSpell.test(msgContent) ? 1 : 0;
		}
		return { is5eAttackSpell }
	})();

	on('ready', () => initScript());

})();