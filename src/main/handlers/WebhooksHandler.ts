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

export const sendPayload = (payloadType: SyncAction): SendPayloadResponse => {
  return { status: WEBHOOK.SUCCESS };
};
