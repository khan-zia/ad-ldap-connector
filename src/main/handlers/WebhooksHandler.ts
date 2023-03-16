import { SyncAction } from '../../renderer/pages/Home';

export const WEBHOOK = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

type SendPayloadResponse = {
  status: (typeof WEBHOOK)[keyof typeof WEBHOOK];
  message?: string;
};

type DispatchActions = { [K in SyncAction]: () => void };

interface DispatchActionProps extends DispatchActions {
  getCsvFile: () => void;
}

const dispatchActions: DispatchActionProps = {
  getCsvFile: function () {
    //
  },

  partialGroups: function () {
    //
  },

  fullGroups: function () {
    //
  },

  partialUsers: function () {
    //
  },

  fullUsers: function () {
    //
  },
};

/**
 * Sends the specified payload to Meveto for syncing.
 *
 * @param payloadType Type of the payload is the same as the action being performed.
 * @param fileName Name of the exported file by PowerShell that should be sent to Meveto.
 */
export const sendPayload = (payloadType: SyncAction, fileName: string): SendPayloadResponse => {
  return { status: WEBHOOK.SUCCESS };
};
