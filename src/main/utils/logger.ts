import got from 'got';
import nconf from 'nconf';

type ContextObject = Record<string, string | number | Record<string, string | number>>;

type LogPayload = {
  timestamp: number;
  message: string;
  levelName: 'debug' | 'error';
  levelNumber: 100 | 400;
  context: ContextObject;
};

interface LogProps {
  queue: LogPayload[];

  /**
   * Adds a debug level log event to the log queue.
   *
   * @param message The debug message to log
   * @param context Additional context information to log. This can be any object.
   */
  debug: (message: string, context?: ContextObject) => void;

  /**
   * Adds an error level log event to the log queue.
   *
   * @param message The error message to log
   * @param context Additional context information about the error to log. This can be any object.
   */
  error: (message: string, context?: ContextObject) => void;

  /**
   * This method prepares the log message from the log event's provided payload by adding default
   * information such as Connector's ID and also preparing the layout. It finally pushes the prepared
   * message to the log queue.
   *
   * @param payload The payload to prepare for logging.
   * @param context Any additional context information to add to this log event.
   */
  preparePayload: (payload: Omit<LogPayload, 'timestamp' | 'context'>, context?: ContextObject) => void;

  /**
   * Pushes a final (prepared) payload to the log queue. It will also automatically flush logs if there have
   * been 20 or more log messages in the queue already or if it had been more than 20 minutes since the last
   * flush.
   *
   * @param payload The final log payload.
   */
  pushToQueue: (payload: LogPayload) => void;

  /**
   * Flushes the queue and resets it. Calling this method will send any available logs in the queue to the
   * Meveto backend.
   */
  flush: () => void;
}

const log: LogProps = {
  queue: [],

  debug: function (message, context) {
    this.preparePayload(
      {
        message,
        levelName: 'debug',
        levelNumber: 100,
      },
      context
    );
  },

  error: function (message, context) {
    this.preparePayload(
      {
        message,
        levelName: 'error',
        levelNumber: 400,
      },
      context
    );
  },

  preparePayload: function (payload, context) {
    const passedContext = context ? context : {};
    const id = nconf.get('appID');
    const timestamp = Math.ceil(new Date().getTime() / 1000);

    const preparedPayload = {
      timestamp,
      message: `${new Date().toUTCString()} | ${payload.message}`,
      levelName: payload.levelName,
      levelNumber: payload.levelNumber,
    };

    // If the connector is configured already, i.e. the connector ID exists,
    // attach it to the log message.
    if (id) {
      this.pushToQueue({
        ...preparedPayload,
        context: {
          connectorID: id,
          ...passedContext,
        },
      });

      return;
    }

    // Else, let the log message be descriptive about it. Add any config data if available.
    this.pushToQueue({
      ...preparedPayload,
      context: {
        connectorID: "Unavailable. Connector is not configured. Connector's config is attached.",
        connectorState: nconf.get('state'),
        ...passedContext,
      },
    });
  },

  pushToQueue: function (payload) {
    const timestamp = Math.ceil(new Date().getTime() / 1000);

    this.queue.push(payload);

    /**
     * Decide if the queue should to be flushed.
     * - After it's been 20 seconds since the previous queued log.
     * - After it's been 20 logs accumulated in the queue.
     */
    let diff = 0;

    if (this.queue.length > 1) {
      const lastQueueTime: number = this.queue.slice(-2, -1)[0].timestamp;
      diff = timestamp - lastQueueTime;
    }

    if (diff >= 20 || this.queue.length >= 20) {
      this.flush();
      return;
    }
  },

  flush: async function () {
    const toBeFlushed = this.queue.slice();
    this.queue = [];

    if (toBeFlushed.length === 0) {
      return;
    }

    try {
      await got.post(nconf.get('webhookUrl'), {
        json: {
          payload: toBeFlushed,
        },
        retry: { limit: 3 },
      });
    } catch (error) {
      // Catch if the flush attempt fails.
    }
  },
};

export default log;
