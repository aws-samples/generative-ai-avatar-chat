import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Props = {
  className?: string;
  square?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
};

const ButtonIcon: React.FC<Props> = (props) => {
  return (
    <button
      className={twMerge(
        'bg-primary text-text-white p-2 text-2xl hover:brightness-150 disabled:cursor-not-allowed disabled:opacity-20 ',
        props.square ? 'rounded-lg' : 'rounded-full',
        props.className
      )}
      disabled={props.disabled}
      onClick={props.onClick}>
      {props.children}
    </button>
  );
};

export default ButtonIcon;
