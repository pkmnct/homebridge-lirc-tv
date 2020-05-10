import net from 'net';
import { Logger } from 'homebridge';

const DELAY_INDENTIFIER = 'DELAY|';

export class LIRCController {
  private sendCommand: Function;

  public sendCommands = (keys: string[]) => {
    return keys.reduce((collector: Promise<void>, key) => {
      return collector.then(
        () =>
          new Promise((resolve, reject) => {
            this.sendCommand(key, resolve, reject);
          })
      );
    }, Promise.resolve());
  };

  constructor(
    private host: string,
    private port: number,
    private remote: string,
    private delay: number,
    private log: Logger
  ) {
    this.sendCommand = (
      key: string,
      resolve: typeof Promise.resolve,
      reject: typeof Promise.reject
    ) => {
      if (key.startsWith(DELAY_INDENTIFIER)) {
        // This is just a delay key, no need to send to LIRC
        const delayTimeout = parseInt(key.replace(DELAY_INDENTIFIER, ''));
        this.log.info(`Delaying for ${delayTimeout}ms`);
        setTimeout(resolve, delayTimeout);
      } else {
        const client = net.connect(
          {
            host: this.host,
            port: this.port
          },
          () => {
            const requestBody = `SEND_ONCE ${this.remote} ${key}`;
            this.log.info(`Sending command to LIRC: ${requestBody}`);
            client.write(`${requestBody}\r\n`);
            client.end();
            setTimeout(resolve, this.delay);
          }
        );

        client.on('error', (error) => {
          this.log.error(error.message);
          reject(error);
        });
      }
    };
  }
}
