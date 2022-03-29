const myScript = (() => {

	const eventTarget = {
		handlers: {},
		on: function(event, handler) {
			this.handlers[event] = this.handlers[event] || [];
			if (typeof(handler) === 'function') this.handlers[event].push(handler);
			else console.warn(`Not a function cunt`)
		},
		trigger: function(event, ...args) {
			if (this.handlers[event]) {
				this.handlers[event].forEach(ev => ev(...args))
			}
		}
	}

	const loadCore = () => {

		const svc = new ServiceLocator();

		svc.register({ serviceName: 'bob', serviceReference: (inp) => {console.log(inp)}});
		svc.register({ serviceName: 'config', serviceReference: new ConfigController() });

		const cli = new CommandLineInterface({name: 'testCli'});
		cli.addOption({
			requiredServices: {
				config: 'ConfigController',
				other: 'bob',
			},
			name: `hideButton`,
			rx: /^hidebut/i,
			description: `Remove a button from the template`,
			action: function(...args) {
				console.log(...args)
			}
		});

		svc.register({ serviceName: 'cli', serviceReference: cli });

		// console.log(cli);
		eventTarget.on('testEvent', cli.trigger);
	
		// console.log('brk')


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

		getService(serviceName) {
			// console.log(this._services)
			if (this._services[serviceName]) return this._services[serviceName];
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
			for (let option in cliData.options) {
				cliData.options[option].name = cliData.options.name || option;
				this.addOption(cliData.options[option]);
			}
			console.log(`Initialised CLI`)
		}

		addOption(data) {
			if (data.name && !this._options[data.name]) {
				const suppliedServices = {}
				if (data.requiredServices) {
					for (let service in data.requiredServices) {
						const svc = this._locator.getService(data.requiredServices[service]);
						if (svc) suppliedServices[service] = svc;
						else console.warn(`${this.name}: Warning - Service "${service}" could not be found for option ${data.name}`);
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

	class ConfigController{ constructor() { Object.assign(this, { getSetting: () => console.log(`Function which does things`) }) } }

	loadCore();

	setTimeout(() => eventTarget.trigger('testEvent', 'hideButton'), 5000)

})();