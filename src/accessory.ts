import { API, AccessoryConfig, AccessoryPlugin, Logging, Service, CharacteristicEventTypes, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue } from 'homebridge';

export class LIRC implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;

  private readonly switchService: Service;
  private readonly informationService: Service;

  private readonly api: API;
  private readonly manufacturer: string;
  private readonly model: string;
  private readonly host: string;
  private readonly port: number;
  private readonly remoteName: string;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.api = api;

    // These should match the placeholders in config.schema.json
    this.name = config.name || 'LIRC TV';
    this.manufacturer = config.manufacturer || 'Unknown';
    this.model = config.model || 'Unknown';
    this.host = config.host;
    this.port = config.port || 8765;
    this.remoteName = config.remoteName;

    this.log.debug('LIRC TV Plugin Loaded');

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(this.api.hap.Characteristic.Model, this.model);

    // create a new "Switch" service
    this.switchService = new this.api.hap.Service.Switch(this.name);

    // link methods used when getting or setting the state of the service 
    this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.getOnHandler.bind(this))   // bind to getOnHandler method below
      .on(CharacteristicEventTypes.SET, this.setOnHandler.bind(this));  // bind to setOnHandler method below
  }

  /**
   * This must return an array of the services to expose.
   * This method must be named "getServices".
   */
  getServices() {
    return [
      this.informationService,
      this.switchService,
    ];
  }

  getOnHandler(callback: CharacteristicGetCallback) {
    this.log.info('Getting switch state');

    const value = false;

    callback(null, value);
  }

  setOnHandler(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.log.info('Setting switch state to:', value);

    callback(null);
  }
}
