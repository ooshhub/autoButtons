/* globals buttons h customButton preset handleInput */

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
				settings: Config.settings,
			}
		} else if (state[scriptName].version < Config.version) {
			let v = state[scriptName].version;
			if (v < `0.1.3`) {
				Object.assign(state[scriptName].settings, { ignoreAPI: 1 }); // new Config key
			}
			if (v < `0.2.0`) {
				Object.assign(state[scriptName].settings, { overkill: 0, overheal: 0, enabledButtons: [] }); // new Config keys
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
	

/**
 * CLASSES
 */
	class ConfigController {
		
		constructor(scriptName, scriptData={}) {
			Object.assign(this, {
				name: scriptName || `newScript`,
				version: { M: 0, m: 0, p: 0 },
				settings: scriptData.settings || {}
			});
			if (scriptData.version) this.version = scriptData.version;
		}

		get version() { return `${this.M}.${this.m}.${this.p}` }
		set version(newVersion) {
			if (typeof(newVersion) === 'object' && newVersion.M && newVersion.m && newVersion.p) Object.assign(this.version, newVersion);
			else {
				const parts = `${newVersion}`.split(/\./g);
				if (!newVersion.parts > 0) return;
				Object.keys(this.version).forEach((v,i) => this.version[v] = parseInt(parts[i]) || 0);
			}
		}

		fetchFromState() { Object.assign(this.settings, state[scriptName].settings); }
		saveToState() { Object.assign(state[scriptName].settings, this.settings); }
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
		// Provide path relative to {Config.settings}, e.g. changeSetting('sheet', 'mySheet');
		// supply newValue as 'toggle' to toggle a 1/0 switch
		changeSetting(pathString, newValue, pathOptions = { baseObject: this.settings, createPath: false }) {
			if (typeof(pathString) !== 'string' || newValue === undefined) return;
			let keyName = (pathString.match(/[^/]+$/)||[])[0],
					path = /.+\/.+/.test(pathString) ? pathString.match(/(.+)\/[^/]+$/)[1] : '';
			let ConfigPath = path ? this._getObjectPath(path, pathOptions.baseObject, pathOptions.createPath) : this.settings;
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
			const currentSheet = this.settings.sheet || '';
			if (Object.keys(preset).includes(currentSheet)) {
				this.settings.templates = preset[currentSheet].templates || [];
				this.settings.enabledButtons = preset[currentSheet].defaultButtons || [];
				this.saveToState();
				return { res: 1, data: `${Config.getSetting('sheet')}` }
			} else return { res: 0, err: `Preset not found for sheet: "${currentSheet}"`}
		}
	}

})()