/* globals buttons h customButton handleInput */

// Tim/Aaron error line construct goes here

const autoButtons = (() => { // eslint-disable-line no-unused-vars

	const scriptName = `autoButtons`,
		scriptVersion = `0.4.5`;

	const Config = new ConfigController(scriptName, {
		version: scriptVersion,
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
	});

	const initScript = () => {
		setTimeout(() => { if (!/object/i.test(typeof(['token-mod']))) return sendChat(scriptName, `/w gm <div style="${styles.error}">tokenMod not found - this script requires tokenMod to function! Aborting init...</div>`), 500 });
		if (!state[scriptName] || !state[scriptName].version) {
			log(`autoButtons: first time setup...`);
			state[scriptName] = {
				version: Config.version,
				settings: Config._settings,
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
			state[scriptName].version = Config.version;
			log(`***UPDATED*** ====> ${scriptName} to v${Config.version}`);
		}
		Config.fetchFromState();
		if (
			(!Config.getSetting('templates/names') || !Config.getSetting('templates/names').length)
			|| (!Config.getSetting('enabledButtons') || !Config.getSetting('enabledButtons').length)) {
				Config.loadPreset();
				h.toChat(`Error fetching Config - loaded preset defaults`);
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
			enabledButtons = Config.getSetting('enabledButtons'),
			validButtons = enabledButtons.filter(v => allButtons.includes(v));
		if (validButtons.length !== enabledButtons.length) Config.changeSetting('enabledButtons', validButtons);
		on('chat:message', handleInput);
		log(`- Initialised ${scriptName} - v${Config.version} -`);
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
	


/**
 * CLASSES
 */
	class ConfigController {

		constructor(scriptName, scriptData={}) {
			Object.assign(this, {
				name: scriptName || `newScript`,
				_version: { M: 0, m: 0, p: 0 },
				_settings: scriptData._settings || {}
			});
			if (scriptData.version) this._version = scriptData.version;
		}

		get version() { return `${this._version.M}.${this._version.m}.${this._version.p}` }
		set version(newVersion) {
			if (typeof(newVersion) === 'object' && newVersion.M && newVersion.m && newVersion.p) Object.assign(this._version, newVersion);
			else {
				const parts = `${newVersion}`.split(/\./g);
				if (!newVersion.parts > 0) return;
				Object.keys(this._version).forEach((v,i) => this._version[v] = parseInt(parts[i]) || 0);
			}
		}

		fetchFromState() { Object.assign(this._settings, state[scriptName]._settings); }
		saveToState() { Object.assign(state[scriptName]._settings, this._settings); }
		_getObjectPath(pathString, baseObject, createPath) {
			const parts = pathString.split(/\/+/g);
			const objRef = parts.reduce((m,v) => {
				if (m == null) return;
				if (m[v] == null) {
					if (createPath) m[v] = {};
					else return null;
				}
				return m[v];}, baseObject)
			return objRef;
		}
		// Provide path relative to {Config._settings}, e.g. changeSetting('sheet', 'mySheet');
		// supply newValue as 'toggle' to toggle a 1/0 switch
		changeSetting(pathString, newValue, pathOptions = { baseObject: this._settings, createPath: false }) {
			if (typeof(pathString) !== 'string' || newValue === undefined) return;
			let keyName = (pathString.match(/[^/]+$/)||[])[0],
					path = /.+\/.+/.test(pathString) ? pathString.match(/(.+)\/[^/]+$/)[1] : '';
			let ConfigPath = path ? this._getObjectPath(path, pathOptions.baseObject, pathOptions.createPath) : this._settings;
			if (ConfigPath && keyName) {
				if (/^toggle$/i.test(newValue)) { // toggle 1/0
					const oldVal = parseInt(this.getSetting(pathString));
					if (oldVal !== 0 && oldVal !== 1) {
						h.toChat(`Setting "${pathString}" could not be toggled: current value is "${oldVal}"`);
						return 0;
					}
					newValue = (1 - oldVal);
				}
				ConfigPath[keyName] = newValue;
				this.saveToState();
				return 1;
			} else {
				log(`${scriptName}: bad Config path ${pathString}`);
				return 0;
			}
		}
		getSetting(pathString) {
			if (typeof(pathString) !== 'string') return null;
			let ConfigValue = this._getObjectPath(pathString);
			return (typeof ConfigValue === 'object') ? JSON.parse(JSON.stringify(ConfigValue)) : ConfigValue;
		}
		loadPreset() {
			const currentSheet = this._settings.sheet || '';
			if (Object.keys(preset).includes(currentSheet)) {
				this._settings.templates = preset[currentSheet].templates || [];
				this._settings.enabledButtons = preset[currentSheet].defaultButtons || [];
				this.saveToState();
				return { res: 1, data: `${Config.getSetting('sheet')}` }
			} else return { res: 0, err: `Preset not found for sheet: "${currentSheet}"`}
		}
	}

	class ButtonController {

		constructor(buttonData={}, errorLogging) {
			Object.assign(this, {
				name: buttonData.name || 'newButtonController', 
				_defaultButtons: {},
				_buttonKeys: ['sheets', 'content', 'tooltip', 'style', 'math', 'default', 'mathString'],
				// errLog: typeof(errorLogging) === 'function' ? errorLogging : console.log,
			});
			for (let button in buttonData.defaultButtons) {
				this._defaultButtons[button] = new Button(buttonData._defaultButtons[button], styles);
			}
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
			const sanitize = [ /=/g, /\bstate\b/gi ];

			sanitize.forEach(rx => { if (rx.test(inputString)) err += `Disallowed value in math formula: "${rx}"` });
			
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
		addButton(buttonData) {
			const newButton = buttonData.default ? new Button(buttonData) : new CustomButton(buttonData);
			if (newButton.err) return { success: 0, err: newButton.err }
			// else
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
				default: buttonData.default || false,
			});
			if (typeof(this.math) !== 'function') return { err: `Button "${this.name}" math function failed validation` };
		}
	}

	class CustomButton extends Button {
		constructor(buttonData={}) {
			if (!buttonData.math) return null;
			buttonData.name = buttonData.name || 'newCustomButton',
			buttonData.default = false;
			buttonData.mathString = typeof(buttonData.math) === 'function' ? buttonData.math.toString() : buttonData.math;
			buttonData.math = ButtonController.parseMathString(buttonData.mathString);
			super(buttonData);
		}
	}

})()