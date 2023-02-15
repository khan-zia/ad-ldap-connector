import { useState } from 'react';
import { Button } from '@mui/material';

type BeginConfigResponse = {
    success: boolean;
    message?: string;
    id?: string;
    publicKey?: string;
}

const BeginConfig = (): JSX.Element => {
    const [configuring, setConfiguring] = useState<boolean>(false);
    const beginConfiguration = (): void => {
        setConfiguring(true);

        fetch('http://localhost:6970/configure', { method: 'post', })
        .then((res) => res.json())
        .then((data: BeginConfigResponse) => {
            if (!data.success) {
                // toast error
            }

            // Process success
        })
        .catch(error => {
            // toast error
        });
    };

    return (
        <>
            <div className='text-lg font-semibold'>Welcome to the Meveto AD/LDAP Connector</div>
            <div className='mt-4'>
                The connector needs configuration. It will generate a connector ID which is a unique identifier for the
                connector instance and a public private key pair. You will need the connector ID and the public key to add this
                connector to your Meveto organization using the organization admin dashboard.
            </div>
            <div className='mt-8'>
                <Button variant='contained' onClick={beginConfiguration} disabled={configuring}>
                {configuring ? 'Configuring...' : 'Begin Configuration'}
                </Button>
            </div>
        </>
    );
}

export default BeginConfig;