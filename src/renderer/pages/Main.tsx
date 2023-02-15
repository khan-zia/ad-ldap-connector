import { useEffect, useState } from 'react';

/**
 * This component is mounted when user visits the main URL (Landing).
 * It aims to determine the state of the connector and thus navigate to the
 * appropriate page.
 */
const Main = (): JSX.Element => {
    const [launching, setLaunching] = useState<boolean>(false);
    const launch = (): void => {
        setLaunching(true);

        fetch('http://localhost:6970/state')
        .then((res) => res.json())
        .then((data) => {
            if (!data.success) {
                // toast error
            }

            // Process sucess
        })
        .catch(error => {
            // toast error
        });
    };

    // Determine state upon mount.
    useEffect(() => launch(), []);

    return (
        <>
            <div className='text-lg font-semibold'>Welcome to the Meveto AD/LDAP Connector</div>
            <div className='mt-4'>
                The connector needs configuration. It will generate a connector ID which is a unique identifier for the
                connector instance and a public private key pair. You will need the connector ID and the public key to add this
                connector to your Meveto organization using the organization admin dashboard.
            </div>
        </>
    );
}

export default Main;