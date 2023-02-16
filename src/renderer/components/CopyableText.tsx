type CopyableTextProps = {
  title?: string;
  text: string;
};

const CopyableText = ({ title, text }: CopyableTextProps): JSX.Element => {
  return (
    <>
      {title && <div className='text-md font-semibold mb-2'>{title}</div>}
      <div className='p-4 rounded bg-white drop-shadow-lg min-w-fit max-w-xl flex flex-nowrap items-center gap-x-2'>
        <div className='text-xl font-semibold text-center'>{text}</div>
        <div></div>
      </div>
    </>
  );
};

export default CopyableText;
