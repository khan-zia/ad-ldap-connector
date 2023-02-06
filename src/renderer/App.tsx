import { useState } from 'react';
import { Button } from '@mui/material';
import Layout from './components/Layout';

const App = (): JSX.Element => {
  const [configuring] = useState<boolean>(false);
  const beginConfiguration = (): void => {
    // setConfiguring(true);
    fetch('http://localhost:6970/configure', {
      method: 'post',
    }).then((res) => console.log({ body: res.body }));
  };
  return (
    <Layout>
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
    </Layout>
  );
};

export default App;
