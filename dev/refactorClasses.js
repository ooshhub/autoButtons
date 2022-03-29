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

	getService(serviceName) {
		console.log(this._services)
		if (this._services[serviceName]) return { [serviceName]: this._services[serviceName] }
		else {
			const rxServices = new RegExp(`${serviceName}`, 'i')
			for (let service in this._services) {
				if (this._services[service].constructor && rxServices.test(this._services[service].constructor.name)) return { [service]: this._services[service] }
			}
		}
	}
}

class CommandLineInterface {

	_options = {};

	constructor(cliData={}) {
		this.name = cliData.name || `Cli`;
		for (let option in cliData.options) {
			cliData.options[option].name = cliData.options.name || option;
			this.addOption(cliData.options[option]);
		}
	}

	addOption(data) { if (data.name && !this._options[data.name]) this._options[data.name] = new CommandLineOption(data) }

}

class CommandLineOption {

	_locator = null;

	constructor(optionData={}) {
		this._locator = ServiceLocator.getLocator();
		optionData.services.forEach(svc => {
			console.log(svc);
			const service = this._locator.getService(svc);
			console.log(service);
			if (service) Object.assign(this, service);
			else console.log(`Warning: CLI option is missing a service "${svc}"`);
		});
		Object.assign(this, {
			name: optionData.name || 'newOption',
			description: optionData.description || `Description goes here...`,
			action: optionData.action
		});
	}
}


const svc = new ServiceLocator();

svc.register({ serviceName: 'bob', serviceReference: (inp) => {console.log(inp)}});
svc.register({ serviceName: 'config', serviceReference: {getSetting: (inp) => console.log(inp) } });

const cli = new CommandLineInterface({services: ['bob'], options: {
		hideButton: {
			rx: /^hidebut/i,
			description: `Remove a button from the template`,
			services: ['config', 'CommandLineInterface'],
			action: function(args) {
				const newVal = `${args}`.trim(),
				oldVal = this.config.getSetting('enabledButtons') || [];
				if (oldVal.length && oldVal.includes(newVal)) {
					// const filtered = oldVal.filter(v=> v !== newVal);
					// this.config.changeSetting('enabledButtons', filtered);
					return `Button "${newVal}" is hidden.`;
				} else console.log(`unrecognised button name`);
			}
		}
	}
});

svc.register({ serviceName: 'cli', serviceReference: cli });

console.log(cli);

console.log('brk')