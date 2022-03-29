/* globals state log on sendChat playerIsGM */

// Tim/Aaron error line construct goes here

const autoButtonsDev = (() => { // eslint-disable-line no-unused-vars

	const scriptName = `autoButtonsDev`,
		scriptVersion = `0.5.0`;

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

	const rx = { on: /\b(1|true|on)\b/i, off: /\b(0|false|off)\b/i };

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
		_buttons = {};

		constructor(data={}) {
			Object.assign(this, { name: data.name || 'newButtonController' });
			for (let svc in data.services) {
				if (!this[svc]) this[svc] = data.services[svc];
			}
			for (let button in data.defaultButtons) { this._buttons[button] = new Button(data.defaultButtons[button], styles) }
		}

		get keys() { return super._buttonKeys }

		getButtonNames(filters={ default: true, currentSheet: false, shown: true, hidden: true }) {
			let buttons = Object.entries(this._buttons);
			const sheet = config.getSetting('sheet'),
				enabledButtons = Config.getSetting('enabledButtons');
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
			this.Config.toStore(`customButtons/${buttonData.name}`, null);
			return { success: 1, msg: `Removed "${buttonData.name}".` }
		}
		showButton(buttonName) {
			if (this._buttons[buttonName] && !this.Config.getSetting('enabledButtons').includes(buttonName)) { return this.Config.changeSetting('enabledButtons', buttonName) }
		}
		hideButton(buttonName) {
			if (this._buttons[buttonName] && this.Config.getSetting('enabledButtons').includes(buttonName)) { return this.Config.changeSetting('enabledButtons', buttonName) }
		}
		saveToStore() {
			const customButtons = this.getButtonNames({default: false});
			for (let button in customButtons) this.Config.toStore(`customButtons/${button}`, customButtons[button]);
		}
		createApiButton(buttonName, damage, crit) {
			const btn = this._buttons[buttonName],
				bar = this.Config.getSetting('hpBar'),
				overheal = this.Config.getSetting('overheal'),
				overkill = this.Config.getSetting('overkill');
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

	class CommandLineInterface {

		_options = {};
		static _services = {};

		constructor(cliData={}) {
			this.name = cliData.name || `${scriptName}Cli`;
			for (let option in cliData.options) this._addOption(cliData.options[option]);
		}
		_addOption(data) { if (data.name && !this._options[data.name]) this._options[data.name] = new CommandLineOption(data) }

	}

	class CommandLineOption {
		constructor(optionData={}) {
			Object.assign(this, {
				name: optionData.name || 'newOption',
				description: optionData.description || `Description goes here...`,
				rx: typeof(optionData.rx) === 'object' && rx.constructor.name === 'RegExp' ? rx : new RegExp(`${optionData.rx}`, 'i'),
				action: typeof(optionData.action) === 'function' ? optionData.action : () => {}
			});
		}
		
	}

	class ServiceLocator {

		static _active = null;
		_services = {};
	
		constructor(data={}) {
			if (ServiceLocator._active) return ServiceLocator._active;
			this.name = `ServiceLocator`;
			for (let svc in services) { if (!this._services) this._services[svc] = services[svc] }
			ServiceLocator._active = this;
		}
	
		static getLocator() { return ServiceLocator._active }
	
		register({ serviceName, serviceReference }) { if (!this._services[serviceName]) this._services[serviceName] = serviceReference }
	
		// Find a service by registered name, or by class constructor name
		getService(serviceName) {
			if (this._services[serviceName]) return { [serviceName]: this._services[serviceName] }
			else {
				const rxServices = new RegExp(`${serviceName}`, 'i')
				for (let service in this._services) {
					if (this._services[service].constructor && rxServices.test(this._services[service].constructor.name)) return { [service]: this._services[service] }
				}
			}
		}
	}

/**
 * 
 * CORE SCRIPT
 * 
 */

	const Services = new ServiceLocator({ name: 'autoButtonServices' });

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
		services: [Services.Config, Services.Buttons]
	});
	Services.register({ serviceName: 'cli', serviceReference: CLI });

	const initScript = () => {
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

	initScript();

})();