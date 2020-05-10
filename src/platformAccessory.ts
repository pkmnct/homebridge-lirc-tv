import { CharacteristicEventTypes } from 'homebridge';
import type {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback
} from 'homebridge';

import { LIRC } from './platform';
import { LIRCController } from './lirc';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LIRCTelevision {
  private service: Service;
  private controller: LIRCController;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    Active: false,
    ActiveIdentifier: 0
  };

  constructor(
    private readonly platform: LIRC,
    private readonly accessory: PlatformAccessory
  ) {
    // Initialize LIRC controller
    this.controller = new LIRCController(
      accessory.context.device.host,
      accessory.context.device.port || 8765,
      accessory.context.device.remote,
      accessory.context.device.delay || 0,
      platform.log
    );

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Default-Manufacturer'
      )
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        'Default-Serial'
      );

    // get the Television service if it exists, otherwise create a new Television service
    this.service =
      this.accessory.getService(this.platform.Service.Television) ??
      this.accessory.addService(this.platform.Service.Television);

    // set the configured name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.ConfiguredName,
      accessory.context.device.name
    );

    // set sleep discovery characteristic
    this.service.setCharacteristic(
      this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Television

    // register handlers for the Active Characteristic (on / off events)
    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .on(CharacteristicEventTypes.SET, this.setActive.bind(this)) // SET - bind to the `setOn` method below
      .on(CharacteristicEventTypes.GET, this.getActive.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the ActiveIdentifier Characteristic (input events)
    this.service
      .getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .on(CharacteristicEventTypes.SET, this.setActiveIdentifier.bind(this)); // SET - bind to the 'setBrightness` method below

    // register handlers for RemoteKey (other key presses)
    this.service
      .getCharacteristic(this.platform.Characteristic.RemoteKey)
      .on(CharacteristicEventTypes.SET, this.setRemoteKey.bind(this));

    // register inputs
    accessory.context.device.inputs.forEach(
      (
        input: {
          id: string;
          name: string;
          type: number; // See InputSourceType from hap-nodejs
        },
        i: number
      ) => {
        const inputService = accessory.addService(
          this.platform.Service.InputSource,
          input.name,
          input.name
        );
        inputService
          .setCharacteristic(this.platform.Characteristic.Identifier, i)
          .setCharacteristic(
            this.platform.Characteristic.ConfiguredName,
            input.name
          )
          .setCharacteristic(
            this.platform.Characteristic.IsConfigured,
            this.platform.Characteristic.IsConfigured.CONFIGURED
          )
          .setCharacteristic(
            this.platform.Characteristic.InputSourceType,
            input.type
          );
        this.service.addLinkedService(inputService);
      }
    );
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setActive(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    // TODO: In the future add a flag to check whether to use current state or not here

    this.controller
      .sendCommands(
        value
          ? this.accessory.context.device.powerOn
          : this.accessory.context.device.powerOff
      )
      .then(() => {
        this.service.updateCharacteristic(
          this.platform.Characteristic.Active,
          value
        );
        this.states.Active = value as boolean;
        this.platform.log.debug('Set Characteristic Active ->', value);
        callback(null);
      })
      .catch((error) => {
        this.platform.log.error(error);
        callback(error);
      });

    // you must call the callback function
    callback(null);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getActive(callback: CharacteristicGetCallback) {
    const isOn = this.states.Active;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    callback(null, isOn);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setActiveIdentifier(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    const thisInput = this.accessory.context.device.inputs[value as number];

    this.controller
      .sendCommands(thisInput.command)
      .then(() => {
        // Store the selected input in state
        this.states.ActiveIdentifier = value as number;
        this.platform.log.debug(
          'Set Characteristic Active Identifier -> ',
          value
        );

        // you must call the callback function
        callback(null);
      })
      .catch((error) => {
        this.platform.log.error(error);
        callback(error);
      });
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  setRemoteKey(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    // TODO: These are not yet implemented
    switch (value) {
      case this.platform.Characteristic.RemoteKey.REWIND: {
        this.platform.log.info('set Remote Key Pressed: REWIND');
        break;
      }
      case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
        this.platform.log.info('set Remote Key Pressed: FAST_FORWARD');
        break;
      }
      case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
        this.platform.log.info('set Remote Key Pressed: NEXT_TRACK');
        break;
      }
      case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
        this.platform.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
        break;
      }
      case this.platform.Characteristic.RemoteKey.ARROW_UP: {
        this.platform.log.info('set Remote Key Pressed: ARROW_UP');
        break;
      }
      case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
        this.platform.log.info('set Remote Key Pressed: ARROW_DOWN');
        break;
      }
      case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
        this.platform.log.info('set Remote Key Pressed: ARROW_LEFT');
        break;
      }
      case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
        this.platform.log.info('set Remote Key Pressed: ARROW_RIGHT');
        break;
      }
      case this.platform.Characteristic.RemoteKey.SELECT: {
        this.platform.log.info('set Remote Key Pressed: SELECT');
        break;
      }
      case this.platform.Characteristic.RemoteKey.BACK: {
        this.platform.log.info('set Remote Key Pressed: BACK');
        break;
      }
      case this.platform.Characteristic.RemoteKey.EXIT: {
        this.platform.log.info('set Remote Key Pressed: EXIT');
        break;
      }
      case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
        this.platform.log.info('set Remote Key Pressed: PLAY_PAUSE');
        break;
      }
      case this.platform.Characteristic.RemoteKey.INFORMATION: {
        this.platform.log.info('set Remote Key Pressed: INFORMATION');
        break;
      }
    }

    callback(null);
  }
}
