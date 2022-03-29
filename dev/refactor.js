/* globals state log on sendChat playerIsGM */ //eslint-disable-line

// Tim/Aaron error line construct goes here

const autoButtonsDev = (() => { // eslint-disable-line no-unused-vars

	const scriptName = `autoButtonsDev`,
		scriptVersion = `0.5.0`;
		
	const Services = new ServiceLocator({ name: 'autoButtonServices' });

/**
 * CORE SCRIPT
 */
	const startScript = () => {

		const Config = new ConfigController(scriptName, {
			version: scriptVersion,
			store: {
				customButtons: {}
			},
			settings: {
				sheet: 'dnd5e_r20',
				templates: {},
				enabledButtons: [],
				gmOnly: true,
				hpBar: true,
				ignoreAPI: true,
				overheal: false,
				overkill: false
			},
		});
		Services.register({serviceName: 'config', serviceReference: Config });

		const ButtonStore = new ButtonController({
			name: 'ButtonStore',
			defaultButtons: {
				damageCrit: {
					sheets: ['dnd5e_r20'],
					tooltip: `Crit (%)`,
					style: styles.crit,
					math: (damage, crit) => -(damage.total + crit.total),
					content: 'kk',
				},
				damageFull: {
					sheets: ['dnd5e_r20'],
					tooltip: `Full (%)`,
					style: styles.full,
					math: (damage) => -(1 * damage.total),
					content: 'k',
				},
				damageHalf: {
					sheets: ['dnd5e_r20'],
					tooltip: `Half (%)`,
					style: styles.half,
					math: (damage) => -(Math.floor(0.5 * damage.total)),
					content: 'b',
				},
				healingFull: {
					sheets: ['dnd5e_r20'],
					tooltip: `Heal (%)`,
					style: styles.healFull,
					math: (damage) => (damage.total),
					content: '&',
				},
			},
			services: [Services.config],
		});
		Services.register({serviceName: 'buttonStore', serviceReference: ButtonStore });

		const CLI = new CommandLineInterface({
			name: `autoButtonsMenu`,
			options: defaultCliOptions,
		});
		Services.register({ serviceName: 'cli', serviceReference: CLI });

		const checkInstall = () => {
			setTimeout(() => { if (!/object/i.test(typeof(['token-mod']))) return sendChat(scriptName, `/w gm <div style="${styles.error}">tokenMod not found - this script requires tokenMod to function! Aborting init...</div>`), 500 });
			if (!state[scriptName] || !state[scriptName].version) {
				log(`autoButtons: first time setup...`);
				state[scriptName] = {
					version: Config.version,
					settings: Config._settings,
					store: Config._store
				}
			} else if (state[scriptName].version < Config.version) {
				let v = state[scriptName].version;
				if (v < `0.1.3`) {
					Object.assign(state[scriptName]._settings, { ignoreAPI: 1 }); // new Config key
				}
				if (v < `0.2.0`) {
					Object.assign(state[scriptName]._settings, { overkill: 0, overheal: 0, enabledButtons: [] }); // new Config keys
				}
				if (v < `0.3.0`) {
					Config.loadPreset(); // structure of preset has changed - reload
				}
				if (v < `0.4.0`) {
					state[scriptName].customButtons = {}; // new button store
				}
				if (v < `0.5.0`) { // major refactor
					state[scriptName].store.customButtons = state[scriptName].customButtons || {};
				}
				log(`***UPDATED*** ====> ${scriptName} to v${Config.version}`);
			}
			state[scriptName].version = Config.version;
			Config.fetchFromState();			
			if (
				(!Config.getSetting('templates/names') || !Config.getSetting('templates/names').length) ||
				(!Config.getSetting('enabledButtons') || !Config.getSetting('enabledButtons').length)) {
					Config.loadPreset();
					helpers.toChat(`Error fetching Config - loaded preset defaults`);
			}
			// log(state[scriptName].settings.enabledButtons);
			// Check state of buttons, repair if needed
			for (let button in state[scriptName].store.customButtons) {
				// log(state[scriptName].store.customButtons[button]);
				state[scriptName].store.customButtons[button].default = false;
				ButtonStore.addButton(state[scriptName].store.customButtons[button]);
			}
			const allButtons = ButtonStore.getButtonNames(),
				enabledButtons = Config.getSetting('enabledButtons');
			const validButtons = enabledButtons.filter(v => allButtons.includes(v));
			if (validButtons.length !== enabledButtons.length) {
				Config.changeSetting('enabledButtons', validButtons);
			}
			on('chat:message', handleInput);
			log(`=( Initialised ${scriptName} - v${Config.version} )=`);
			log(state[scriptName]);
		}
		
		const sendButtons = (damage, crit, msg) => {
			const gmOnly = Config.getSetting('gmOnly') ? true : false;
			let buttonHtml = '',
				activeButtons = Config.getSetting(`enabledButtons`) || [],
				name = helpers.findName(msg.content);
			name = name || `Apply:`;
			activeButtons.forEach(btn => buttonHtml += ButtonStore.createApiButton(btn, damage, crit));
			const buttonTemplate = `<div class="autobutton" style="${styles.outer}"><div style="${styles.rollName}">${name}</div>${buttonHtml}</div>`;
			helpers.toChat(`${buttonTemplate}`, gmOnly);
		}

		const handleDamageRoll = (msg) => {
			const dmgFields = Config.getSetting('templates/damageProperties/damage')||[],
				critFields = Config.getSetting('templates/damageProperties/crit')||[];
			const damage = helpers.processFields(dmgFields, msg),
				crit = helpers.processFields(critFields, msg);
			if ('dnd5e_r20' === Config.getSetting('sheet')) {
				const isSpell = helpers5e.is5eAttackSpell(msg.content);
				if (isSpell) {
					const upcastDamageFields = Config.getSetting('templates/damageProperties/upcastDamage')||[],
						upcastCritFields = Config.getSetting('templates/damageProperties/upcastCrit')||[];
					damage.total += helpers.processFields(upcastDamageFields, msg).total||0;
					crit.total += helpers.processFields(upcastCritFields, msg).total||0;
				}
			}
			crit.total += damage.total;
			sendButtons(damage, crit, msg);
		}

		const handleInput = (msg) => {
			log(Config.name);
			const msgIsGM = playerIsGM(msg.playerid);
			if (msg.type === 'api' && msgIsGM && /^!(autobut)/i.test(msg.content)) {
				let cmdLine = (msg.content.match(/^![^\s]+\s+(.+)/i) || [])[1],
						params = cmdLine ? cmdLine.split(/\s*--\s*/g) : [];
				params.shift();
				if (params.length) CLI.assess(params);
			}
			else if (msg.rolltemplate && Config.getSetting('templates/names').includes(msg.rolltemplate)) {
				const ignoreAPI = Config.getSetting('ignoreAPI');
				if (ignoreAPI && /^api$/i.test(msg.playerid)) return;
				handleDamageRoll(msg);
			}
		}

		checkInstall();

	}

	// Setting up a sheet:
	// Follow the pattern for the 5e sheet -
	//  names: array of the roll template property names to watch in chat and respond to with buttons
	//  damageProperties: core damage function expects and array for 'damage' and 'crit', but either can be empty if not relevant.
	//  other arrays can be created, but will need custom code in the handleDamageRoll() function to do anything with them
	//  All roll template property names entered into the 'damage' and 'crit' arrays will be available in button math, math: (d,c) => {}
	// 
	// defaultButtons: the default buttons to show in the button template
	// TODO: Replace with PresetController class
	const preset = {
		dnd5e_r20: {
			sheet: ['dnd5e_r20'],
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
			// userButtons array, to save user button setup?
		},
		custom: {
			sheet: [],
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

	// const rx = { on: /\b(1|true|on)\b/i, off: /\b(0|false|off)\b/i };

	// Helper functions
	const helpers = (() => { 
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

		const toChat = (msg, whisper = true) => {
			let prefix = whisper ? `/w gm ` : '';
			sendChat(scriptName, `${prefix}${msg}`, {noarchive: true});
		}
		const toArray = (inp) => Array.isArray(inp) ? inp : [inp];
		const emproper = (inpString) => {
			let words = inpString.split(/\s+/g);
			return words.map(w => `${w[0].toUpperCase()}${w.slice(1)}`).join(` `);
		}

		return { processFields, findName, toChat, toArray, emproper }
	})();

	// 5e specific
	const helpers5e = (() => {
		const is5eAttackSpell = (msgContent) => {
			const rxSpell = /{spelllevel=(cantrip|\d+)/;
			return rxSpell.test(msgContent) ? 1 : 0;
		}
		return { is5eAttackSpell }
	})();

	// Default command line options
	const defaultCliOptions = [
		{
			name: 'reset',
			rx: /^reset/i,
			description: `Reset configuration from preset`,
			requiredServices: {
				config: 'ConfigController'
			},
			action: function () {
				if (this.config.getSetting('sheet')) {
					this.config.loadPreset();
					return `Config reset from preset: "${this.config.getSetting('sheet')}"`;
				} else helpers.toChat(`No preset found!`);
			}
		},
		{
			name: 'bar',
			rx: /^(hp)?bar/i,
			description: `Select which token bar represents hit points`,
			requiredServices: {
				config: 'ConfigController'
			},
			action: function (args) {
				const newVal = parseInt(`${args}`.replace(/\D/g, ''));
				if (newVal > 0 && newVal < 4) {
					if (this.config.changeSetting('hpBar', newVal)) return `hpBar: ${newVal}`;
				}
			}
		},
		{
			name: 'loadPreset',
			rx: /^loadpre/i,
			description: `Select a preset for a Game System`,
			requiredServices: { config: 'ConfigController', buttons: 'ButtonController' },
			action: function (args) {
				const newVal = args.trim();
				if (Object.keys(preset).includes(newVal)) {
					if (this.config.changeSetting('sheet', newVal)) {
						this.config.loadPreset();
						this.buttons.validateButtons();
						return `Preset changed: ${newVal}`;
					} else helpers.toChat(`${scriptName}: error changing preset to "${newVal}"`);
				}
			}
		},
		{
			name: 'listTemplates',
			rx: /^(list)?templ/i,
			description: `List roll templates the script is listening for`,
			requiredServices: { config: 'ConfigController' },
			action: function () {
				const templates = this.config.getSetting(`templates/names`),
					templateText = `{{&nbsp;${templates.join(', ')}}}`,
					chatText = `&{template:default} {{name=Trigger Templates}} ${templateText}`;
				helpers.toChat(chatText);
			}
		},
		{
			name: 'addTemplate',
			rx: /^addtem/i,
			description: `Add roll template name to listen list for damage rolls`,
			action: function (args) {
				this.cli.helpers.modifyConfigArray(args, 'templates/names');
			}
		},
		{
			name: 'removeTemplate',
			rx: /^rem(ove)?tem/i,
			description: `Remove roll template from listen list`,
			action: function (args) {
				this.cli.helpers.modifyConfigArray(args, 'templates/names', 0);
			}
		},
		{
			name: 'listProperties',
			rx: /^(list)?(propert|props)/i,
			description: `List roll template properties inline rolls are grabbed from`,
			requiredServices: { config: 'ConfigController' },
			action: function () {
				const properties = this.config.getSetting('templates/damageProperties');
				let templateText = ``;
				if (typeof properties === 'object') {
					for (let category in properties) templateText += `{{&nbsp;${category}=${properties[category].join(`, `)}}}`
				} else return log(`${scriptName}: Error getting damage properties from state`);
				const chatOutput = `&{template:default} {{name=Roll Template Properties}} ${templateText}`;
				helpers.toChat(chatOutput);
			}
		},
		{
			name: 'addProperty',
			rx: /^addprop/i,
			description: `Add a roll template property to the listener`,
			requiredServices: { config: 'ConfigController' },
			action: function (args) {
				const parts = args.match(/([^/]+)\/(.+)/);
				if (parts && parts.length === 3) {
					if (this.config.getSetting(`templates/damageProperties/${parts[1]}`) == null) {
						helpers.toChat(`Created new roll template damage property category: ${parts[1]}`);
						state[scriptName].settings.templates.damageProperties[parts[1]] = [];
					}
					this.cli.helpers.modifyConfigArray(parts[2], `templates/damageProperties/${parts[1]}`);
				} else {
					helpers.toChat(`Bad property path supplied, must be in the form "category/propertyName". Example: damage/dmg1`);
				}
			}
		},
		{
			name: 'removeProperty',
			rx: /^rem(ove)?prop/i,
			description: `Remove a roll template property from the listener`,
			requiredServices: { config: 'ConfigController' },
			action: function (args) {
				const parts = args.match(/([^/]+)\/(.+)/);
				if (parts && parts.length === 3) {
					const currentArray = this.config.getSetting(`templates/damageProperties/${parts[1]}`);
					if (currentArray != null) {
						const removed = this.cli.helpers.modifyConfigArray(parts[2], `templates/damageProperties/${parts[1]}`, 0);
						if (removed && !/^(damage|crit)$/i.test(parts[1])) { // Clean up category if it's now empty, and isn't a core category
							const newArray = this.config.getSetting(`templates/damageProperties/${parts[1]}`);
							if (newArray.length === 0) delete state[scriptName].settings.templates.damageProperties[parts[1]];
						}
					} else helpers.toChat(`Could not find roll template property category: ${parts[1]}`);
				} else {
					helpers.toChat(`Bad property path supplied, must be in the form "category/propertyName". Example: damage/dmg1`);
				}
			}
		},
		{
			name: 'listButtons',
			rx: /^(list)?button/i,
			description: `List available buttons`,
			requiredServices: { config: 'ConfigController', buttons: 'ButtonController' },
			action: () => {
				const allButtons = this.buttons.getNames(),
					removableButtons = this.buttons.getNames(false),
					usedButtons = this.config.getSetting('enabledButtons'),
					unusedButtons = allButtons.filter(v => !usedButtons.includes(v)),
					availableButtons = this.buttons.validateButtons(unusedButtons),
					reorderedButtons = usedButtons.concat(unusedButtons);
				const links = {
					hide: `!autoButton --hideButton %name%`,
					show: `!autoButton --showButton %name%`,
					delete: `!autoButton --deleteButton %name%`,
					disabled: `#`
				}
				const labels = {
					hide: `E<span style="${styles.list.controls.no}">/</span>`,
					show: 'E',
					delete: 'D',
					disabled: '!'
				};
				const controls = ['show', 'hide', 'delete'];
				const listBody = reorderedButtons.map(button => {
					let rowHtml = `<div class="list-row" style="${styles.list.row}"><div class="button-name" style="${styles.list.name}">${removableButtons.includes(button) ? '' : '&ast;'}%name%</div>`;
					controls.forEach(control => {
						const controlType = (
								(control === 'show' && availableButtons.includes(button)) ||
								(control === 'hide' && usedButtons.includes(button)) ||
								(control === 'delete' && removableButtons.includes(button))) ?
							control : 'disabled';
						rowHtml += `<div class="control-${control}" style="${styles.list.buttonContainer}" title="${helpers.emproper(`${control} button`)}"><a href="${links[controlType]}" style="${styles.list.controls.common}${styles.list.controls[controlType]}">${labels[control]}</a></div>`;
					});
					return `${rowHtml.replace(/%name%/g, button)}</div>`;
				});
				const fullTemplate = `
			<div class="autobutton-list" style="${styles.list.container}">
				<div class="autobutton-header" style="${styles.list.header}">autoButton list (sheet: ${this.config.getSetting('sheet')})</div>
				<div class="autobutton-body" style="${styles.list.body}">
					${listBody.join('')}
				</div>
				<div class="autobutton-footer" style="${styles.list.footer}">
					<div style="${styles.list.buttonContainer}width:auto;"><a style="${styles.list.controls.create}" href="!autobut --createbutton {{name=?{Name?|newButton}}} {{content=?{Pictos Character?|k}}} {{tooltip=?{Tooltip?|This is a button}}} {{math=?{Math function|floor(damage.total/2&rpar;}}}">Create New Button</a></div>
				</div>
			</div>
			`;
				helpers.toChat(`/w gm ${fullTemplate.replace(/\n/g, '')}`, false);
			},
		},
			{
				name: 'showButton',
				rx: /^showbut/i,
				description: `Add a button to the template`,
				requiredServices: { config: 'ConfigController', buttons: 'ButtonController' },

				action: function (args) {
					const newVal = args.trim();
					if (this.buttons.validateButtons(newVal).length) {
						let oldVal = this.config.getSetting('enabledButtons');
						if (!oldVal.includes(newVal)) {
							oldVal.push(newVal);
							this.config.changeSetting('enabledButtons', oldVal);
							return `Button "${newVal}" is now visible.`;
						} else helpers.toChat(`Button "${newVal}" already exists.`)
					} else helpers.toChat(`Unrecognised or incompatible button: "${newVal}"`);
				}
			},
			{
				name: 'hideButton',
				rx: /^hidebut/i,
				description: `Remove a button from the template`,
				requiredServices: { config: 'ConfigController' },
				action: function (args) {
					const newVal = args.trim(),
						oldVal = this.config.getSetting('enabledButtons');
					if (oldVal.length && oldVal.includes(newVal)) {
						const filtered = oldVal.filter(v => v !== newVal);
						this.config.changeSetting('enabledButtons', filtered);
						return `Button "${newVal}" is hidden.`;
					} else log(`${scriptName}: unrecognised button name`);
				}
			},
			{
				name: 'reorderButtons',
				rx: /^(re)?order/i,
				description: `Change order of buttons`,
				requiredServices: { config: 'ConfigController' },
				action: function (args) {
					if (!args) return;
					const newIndices = args.replace(/[^\d,]/g, '').split(/,/g),
						currentOrder = this.config.getSetting('enabledButtons');
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
					if (!valid) return helpers.toChat(`Invalid button order input: ${args}. Indices must be between 1 and total number of buttons in use.`);
					newOrder = newOrder.concat(currentOrder.filter(v => v));
					if ((newOrder.length === currentOrder.length) && this.config.changeSetting('enabledButtons', newOrder)) return `Button order changed to: [ ${newOrder.join(' | ')} ]`;
				}
			},
			{
				name: 'createButton',
				rx: /^createbut/i,
				description: `Create a new button`,
				requiredServices: { config: 'ButtonController' },
				action: function (args) {
					const buttonData = this.cli.helpers.splitHandlebars(args);
					if (buttonData && buttonData.name) {
						if (/^[^A-Za-z]/.test(buttonData.name)) return `Invalid button name: must start with a letter`;
						let buttonName = /\s/.test(buttonData.name) ? this.cli.helpers.camelise(buttonData.name) : buttonData.name;
						if (this.buttons.getNames().includes(buttonName)) return `Invalid button name, already in use: "${buttonName}"`;
						if (!buttonData.math) return `Button must have an associated function, {{math=...}}`;
						const newButton = new CustomButton(buttonData);
						if (newButton && newButton.math) {
							const {
								res,
								err
							} = this.buttons.editButton(buttonName, newButton, 1);
							if (res) return `Successfully added button "${buttonName}"`;
							else return `Failed to create button "${buttonName}" - ${err}`;
						}
					} else return `Bad input for button creation`
				}
			},
			{
				name: 'editButton',
				rx: /^editbut/i,
				description: `Edit an existing button`,
				requiredServices: { config: 'ButtonController' },
				action: function (args) {
					let buttonData = this.cli.helpers.splitHandlebars(args);
					// log(buttonData);
					if (buttonData && buttonData.name) {
						const buttonName = /\s/.test(buttonData.name) ? this.cli.helpers.camelise(buttonData.name) : buttonData.name;
						if (buttonData.math) {
							buttonData.mathString = buttonData.math;
							let newFunc = CustomButton.parseActionString(buttonData.math);
							// log(newFunc.toString());
							buttonData.math = newFunc;
						}
						if (buttonData.math === null) return `Bad math function supplied in edit.`;
						// log(buttonData);
						const {
							res,
							err
						} = this.buttons.editButton(buttonName, buttonData)
						if (res) return `Successfully edited button "${buttonName}"`;
						else return `Failed to save edits to button "${buttonName}" - ${err}`;
					}
				}
			},
			{
				name: 'deleteButton',
				rx: /^del(ete)?but/i,
				description: `Remove a button`,
				requiredServices: { config: 'ButtonController' },
				action: function (args) {
					const {
						res,
						err
					} = this.buttons.editButton(args, false);
					if (res) {
						this.cli.helpers.modifyConfigArray(args, 'enabledButtons', 0);
						return `Successfully deleted button ${args}`;
					} else return `Couldn't delete button ${args} - ${err}`;
				}
			},
			{
				name: 'ignoreApi',
				rx: /^ignoreapi/i,
				description: `Ignore anything sent to chat by the API`,
				action: function(args) { this.cli.helpers.toggle('ignoreAPI', args) }
			},
			{
				name: 'overheal',
				rx: /^overh/i,
				description: `Allow healing to push hp above hpMax`,
				action: function (args) { this.cli.helpers.toggle('overheal', args) }
			},
			{
				name: 'overkill',
				rx: /^overk/i,
				description: `Allow healing to push hp above hpMax`,
				action: function (args) { this.cli.helpers.toggle('overkill', args) }
			},
			{
				name: 'gmOnly',
				rx: /^gmo/i,
				description: `Whisper the buttons to GM, or post publicly`,
				action: function (args) { this.cli.helpers.toggle('gmOnly', args) }
			},
			{
				name: 'settings',
				rx: /^setting/i,
				description: `Open settings UI`,
				action: () => helpers.toChat(`Not yet implemented.`)
			},
			{
				name: 'help',
				rx: /^(\?$|h$|help)/i,
				description: `Display script help`,
				action: () => {}
			},
			{
				name: 'uninstall',
				rx: /^uninstall$/i,
				description: `Remove all script settings from API state`,
				action: () => {
					state[scriptName] = null;
					delete state[scriptName];
					helpers.toChat(`Removed all ${scriptName} settings from API state.`)
				}
			}
	]

 /**
 * 
 * CLASS DEFINITIONS
 * 
 */
	class ConfigController {

		_version = { M: 0, m: 0, p: 0 };

		constructor(scriptName, scriptData={}) {
			Object.assign(this, {
				name: scriptName || `newScript`,
				// _version: { M: 0, m: 0, p: 0 },
				_settings: scriptData.settings || {},
				_store: scriptData.store || {},
			});
			if (scriptData.version) this.version = scriptData.version;
		}

		_getObjectPath(pathString, baseObject, createPath, deleteTarget) {
			const parts = pathString.split(/\/+/g);
			const objRef = parts.reduce((m,v,i) => {
				if (m == null) return;
				if (m[v] == null) {
					if (createPath) m[v] = {};
					else return null;
				}
				if (deleteTarget && (i === parts.length-1)) delete m[v];
				else return m[v];}, baseObject)
			return objRef;
		}

		// If value exists in array, it will be removed, otherwise it will be added
		// Do validation beforehand
		_modifyArray(targetArray, newValue) { 
			if (!Array.isArray(targetArray || newValue == null)) return log(`${scriptName}: _modifyArray error, bad parameters`);
			return targetArray.includes(newValue) ? { result: 'removed', newArray: targetArray.filter(v=>v!==newValue) } : { result: 'added', newArray: targetArray.push(newValue) }
		}

		get version() { return `${this._version.M}.${this._version.m}.${this._version.p}` }
		set version(newVersion) {
			if (typeof(newVersion) === 'object' && newVersion.M && newVersion.m && newVersion.p) Object.assign(this._version, newVersion);
			else {
				const parts = `${newVersion}`.split(/\./g);
				log(`version parts: ${parts.join(' - ')}`);
				if (!parts.length) log(`Bad version number, not setting version.`)
				else Object.keys(this._version).forEach((v,i) => this._version[v] = parseInt(parts[i]) || 0);
			}
		}

		fromStore(path) { return this._getObjectPath(path, this._store, false) }
		toStore(path, data) { // Supplying data=null will delete the target
			const ref = this._getObjectPath(path, this._store, true);
			if (ref) {
				if (data) {
					Object.assign(ref, data);
					return { success: 1, msg: `New data written to "${path}"` }
				} else if (data === null) {
					this._getObjectPath(path, this._store, false, true);
					return { success: 1, msg: `${path} deleted from store.` }
				} else return { success: 0, err: `Bad data supplied (type: ${typeof data})` }
			} else return { success: 0, err: `Bad store path: "${path}"` }
		}

		fetchFromState() { Object.assign(this._settings, state[scriptName].settings); }
		saveToState() { Object.assign(state[scriptName].settings, this._settings); }

		// Provide path relative to {Config._settings}, e.g. changeSetting('sheet', 'mySheet');
		// booleans with no "newValue" supplied will be toggled
		changeSetting(pathString, newValue, pathOptions = { baseObject: this._settings, createPath: false }) {
			let modded = [];
			if (typeof(pathString) !== 'string' || newValue === undefined) return;
			const keyName = (pathString.match(/[^/]+$/)||[])[0],
				path = /.+\/.+/.test(pathString) ? pathString.match(/(.+)\/[^/]+$/)[1] : '',
				configPath = path ? this._getObjectPath(path, pathOptions.baseObject, pathOptions.createPath) : this._settings;
			if (configPath && keyName) {
				if (typeof(configPath[keyName]) === 'boolean') {
					configPath[keyName] = (newValue == null) ? !configPath[keyName] : configPath[keyName] ? true : false;
					modded.push(`${configPath[keyName]}: ${this.getSetting(pathString)}`);
				}
				else if (Array.isArray(configPath[keyName])) {
					const { newArray, result } = this._modifyArray(configPath[keyName], newValue);
					if (result) {
						configPath[keyName] = newArray;
						modded.push(`${newValue} was ${result} to ${pathString}`);
					}
				}
				else {
					configPath[keyName] = newValue;
					modded.push(`${configPath[keyName]}: ${newValue}`);
				}
				if (modded.length) {
					this.saveToState()
					return { success: 1, msg: `Settings changed: ${modded.join('\n')}` }
				}
			} else {
				return { success: 0, err: `Bad Config path ${pathString}` }
			}
		}
		getSetting(pathString, baseObject = this._settings) {
			// log(`getsetting ${pathString}`);
			if (typeof(pathString) !== 'string') return null;
			let configValue = this._getObjectPath(pathString, baseObject, false);
			// log(configValue);
			return (typeof configValue === 'object') ? JSON.parse(JSON.stringify(configValue)) : configValue;
		}
		loadPreset() {
			const currentSheet = this._settings.sheet || '';
			if (Object.keys(preset).includes(currentSheet)) {
				this._settings.templates = preset[currentSheet].templates || [];
				this._settings.enabledButtons = preset[currentSheet].defaultButtons || [];
				this.saveToState();
				return { res: 1, data: `${this.getSetting('sheet')}` }
			} else return { res: 0, err: `Preset not found for sheet: "${currentSheet}"`}
		}
	}

	class ButtonController {

		static _buttonKeys = ['sheets', 'content', 'tooltip', 'style', 'math', 'default', 'mathString'];
		_locator = null;
		_Config = {};
		_buttons = {};

		constructor(data={}) {
			Object.assign(this, { name: data.name || 'newButtonController' });
			// Requires access to a ConfigController
			this._locator = ServiceLocator.getLocator() || this._locator;
			this._Config = this._locator ? this._locator.getService('ConfigController') : null;
			if (!this._Config) return {};
			for (let button in data.defaultButtons) { this._buttons[button] = new Button(data.defaultButtons[button], styles) }
		}

		get keys() { return super._buttonKeys }

		getButtonNames(filters={ default: true, currentSheet: false, shown: true, hidden: true }) {
			let buttons = Object.entries(this._buttons);
			const sheet = this._Config.getSetting('sheet'),
				enabledButtons = this._Config.getSetting('enabledButtons');
			if (!filters.default) buttons = buttons.filter(kv => !kv[1].default);
			if (filters.currentSheet) buttons = buttons.filter(kv => (!kv[1].sheets.length || sheet === 'custom' || kv[1].sheets.includes(sheet)));
			if (!filters.shown) buttons = buttons.filter(kv => enabledButtons.includes(kv[0]));
			if (!filters.hidden) buttons = buttons.filter(kv => !enabledButtons.includes(kv[0]));
			const output =  buttons.map(kv=>kv[0]);
			// log(`button names: ${output.join(', ')}`);
			return output;
		}

		static parseMathString(inputString) {
			let err = '';
			// Convert to JS
			const formulaReplacer = {
				'$1Math.floor': /([^.]|^)floor/ig,
				'$1Math.ceil': /([^.]|^)ceil/ig,
				'$1Math.round': /([^.]|^)round/ig,
				'($1||0)': /((damage|crit)\.\w+)/ig,
			}
			// Very basic security, at least stops a `state = null`
			const disallowed = [ /=/g, /\bstate\b/gi ];

			disallowed.forEach(rx => { if (rx.test(inputString)) err += `Disallowed value in math formula: "${`${rx}`.replace(/(\\\w|\/)/g, '')}"` });
			
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
			} catch(e) { err += (`${scriptName}: formula failed validation`) }

			if (validate && !err) {
				return newFunc;
			}	else {
				return new Error(err);
			}
		}
		addButton(buttonData={}) {
			const newButton = buttonData.default ? new Button(buttonData) : new CustomButton(buttonData);
			if (newButton.err) return { success: 0, err: newButton.err }
			if (this._buttons[newButton.name]) return { success: 0, err: `Button "${newButton.name}" already exists` };
			this._buttons[newButton.name] = newButton;
			this.saveToStore();
			return { success: 1, msg: `Button "${newButton.name} successfully created`}
		}
		editButton(buttonData={}) {
			let modded = [];
			if (!this._buttons[buttonData.name]) return { success: 0, err: `Button "${buttonData.name}" does not exist.` }
			if (this._buttons[buttonData.name].default) return { success: 0, err: `Cannot edit default buttons.` }
			this.keys.forEach(k => {
				if (buttonData[k] != null) {
					if (k === 'math') {
						let newMath = ButtonController.parseMathString(buttonData[k]);
						if (newMath.err) helpers.toChat(newMath.err);
						else {
							this._buttons[buttonData.name].mathString = buttonData[k];
							this._buttons[buttonData.name].math = newMath;
							modded.push(k);
						}
					} else {
						this._buttons[buttonData.name][k] = buttonData[k];
						modded.push(k);
					}
				}
			});
			if (modded.length) this.saveToStore();
			return modded.length ? { success: 1, msg: `Modified ${buttonData.name} fields: ${modded.join(', ')}` } : { success: 0, err: `No fields supplied.` }
		}
		removeButton(buttonData={}) {
			if (!this._buttons[buttonData.name]) return { success: 0, err: `Button "${buttonData.name}" does not exist.` }
			if (this._buttons[buttonData.name].default) return { success: 0, err: `Cannot delete default buttons.` }
			delete this._buttons[buttonData.name];
			this._Config.toStore(`customButtons/${buttonData.name}`, null);
			return { success: 1, msg: `Removed "${buttonData.name}".` }
		}
		showButton(buttonName) {
			if (this._buttons[buttonName] && !this._Config.getSetting('enabledButtons').includes(buttonName)) { return this._Config.changeSetting('enabledButtons', buttonName) }
		}
		hideButton(buttonName) {
			if (this._buttons[buttonName] && this._Config.getSetting('enabledButtons').includes(buttonName)) { return this._Config.changeSetting('enabledButtons', buttonName) }
		}
		saveToStore() {
			const customButtons = this.getButtonNames({default: false});
			for (let button in customButtons) this._Config.toStore(`customButtons/${button}`, customButtons[button]);
		}
		createApiButton(buttonName, damage, crit) {
			const btn = this._buttons[buttonName],
				bar = this._Config.getSetting('hpBar'),
				overheal = this._Config.getSetting('overheal'),
				overkill = this._Config.getSetting('overkill');
			if (!btn || typeof(btn.math) !== 'function') {
				log(`${scriptName}: error creating API button ${buttonName}`);
				log(`No button found or invalid math function: ${btn.math}`);
				return ``;
			}
			const modifier = btn.math(damage, crit),
			tooltip = btn.tooltip.replace(/%/, `${modifier} HP`),
				tokenModCmd = (modifier > 0) ? (!overheal) ? `+${modifier}!` : `+${modifier}` : (modifier < 0 && !overkill) ? `${modifier}!` : modifier;
			return `<div style="${styles.buttonContainer}"  title="${tooltip}"><a href="!token-mod --set bar${bar}_value|${tokenModCmd}" style="${styles.buttonShared}${btn.style}">${btn.content}</a></div>`;
		}
	}

	class Button {
		constructor(buttonData={}, styleData) {
			Object.assign(this, {
				name: buttonData.name || 'newButton',
				sheets: Array.isArray(buttonData.sheets) ? buttonData.sheets : [],
				tooltip: `${buttonData.tooltip || ''}`,
				style: styleData[buttonData.style] || buttonData.style || '',
				content: buttonData.content || '?',
				math: buttonData.math || null,
				default: buttonData.default || true,
			});
			if (typeof(this.math) !== 'function') return { err: `Button "${this.name}" math function failed validation` };
		}
	}

	class CustomButton extends Button {
		constructor(buttonData={}) {
			if (!buttonData.math) return { err: `Button must contain a function in 'math' key.` };
			buttonData.name = buttonData.name || 'newCustomButton',
			buttonData.default = false;
			buttonData.mathString = typeof(buttonData.math) === 'function' ? buttonData.math.toString() : buttonData.math;
			buttonData.math = ButtonController.parseMathString(buttonData.mathString);
			super(buttonData);
		}
	}

	class ServiceLocator {

		static _active = null;
		_services = {};

		constructor(services={}) {
			if (ServiceLocator._active) return ServiceLocator._active;
			this.name = `ServiceLocator`;
			for (let svc in services) { this._services[svc] = services[svc] }
			ServiceLocator._active = this;
		}

		static getLocator() { return ServiceLocator._active }

		register({ serviceName, serviceReference }) { if (!this._services[serviceName]) this._services[serviceName] = serviceReference }

		// Find a service. If service has multiple instances, make sure to request by instance name, or only the first registered constructor name will be returned.
		// Search by Class Constructor Name is only suitable for unique class instances
		getService(serviceName) {
			if (this._services[serviceName]) return { [serviceName]: this._services[serviceName] }
			else {
				const rxServices = new RegExp(`${serviceName}`, 'i')
				for (let service in this._services) {
					if (this._services[service].constructor && rxServices.test(this._services[service].constructor.name)) return this._services[service];
				}
			}
		}
	}

	class CommandLineInterface {

		_locator = null;
		_options = {};

		constructor(cliData={}) {
			this.name = cliData.name || `Cli`;
			this._locator = ServiceLocator.getLocator();
			if (!this._locator) console.warn(`${this.constructor.name} could not find the service locator. Any commands relying on services will be disabled.`);
			(cliData.options||[]).forEach(option => {
				if (option.name && option.action) this.addOption(option);
			});
			console.log(`Initialised CLI`);
		}

		addOption(data) {
			if (data.name && !this._options[data.name]) {
				const suppliedServices = { cli: this }
				if (data.requiredServices) {
					for (let service in data.requiredServices) {
						const svc = this._servicesthis._locator.getService(data.requiredServices[service]);
						if (svc) suppliedServices[service] = svc;
						else return console.warn(`${this.name}: Warning - Service "${service}" could not be found for option ${data.name}. CLI option not registered.`);
					}
				}
				data.services = suppliedServices;
				this._options[data.name] = new CommandLineOption(data);
				console.log(`Created a CLI option`);
			} else console.warn(`Bad data supplied to CLI Option constructor`);
		}

		trigger(option) { console.log(`Triggered function ${option}`) }

	}

	class CommandLineOption {

		constructor(optionData={}) {
			for (let service in optionData.services) {
				this[service] = optionData.services[service];
			}
			Object.assign(this, {
				name: optionData.name || 'newOption',
				rx: optionData.rx || new RegExp(`${optionData.name}`, 'i'),
				description: optionData.description || `Description goes here...`,
				action: optionData.action
			});
		}
		
	}

	startScript();

})();