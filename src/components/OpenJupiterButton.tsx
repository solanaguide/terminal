import React from 'react';

import ExternalIcon from '../icons/ExternalIcon';

const OpenJupiterButton: React.FC<{ href: string }> = ({ href }) => {
  return (
    <a href={href} target={'_blank'} rel="noreferrer" className="underline cursor-pointer ml-auto mt-2 p-2">
      <div className=" flex items-center space-x-2 text-xs">
        <span>Open Jupiter</span>
        <ExternalIcon />
      </div>
    </a>
  );
};

export default OpenJupiterButton;