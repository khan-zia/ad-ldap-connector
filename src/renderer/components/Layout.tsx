import React, { PropsWithChildren } from 'react';

const Layout: React.FC<PropsWithChildren> = (props): JSX.Element => {
  const { children } = props;
  return (
    <>
      <div className='w-full px-8 flex items-center h-20 shadow-md'>
        <img src='../assets/logo.png' className='w-32 h-12' alt='Meveto Logo' />
      </div>
      <div className='py-8 px-10'>{children}</div>
    </>
  );
};

export default Layout;
