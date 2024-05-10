import { Fragment, useCallback, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { PiCaretUpDown, PiCheck, PiX } from 'react-icons/pi';
import { twMerge } from 'tailwind-merge';

type Props = {
  className?: string;
  label?: string;
  value: string;
  disabled?: boolean;
  options: {
    value: string;
    label: string;
  }[];
  clearable?: boolean;
  onChange: (value: string) => void;
};

const Select: React.FC<Props> = (props) => {
  const selectedLabel = useMemo(() => {
    return props.value === ''
      ? ''
      : props.options.filter((o) => o.value === props.value)[0].label;
  }, [props.options, props.value]);

  const onClear = useCallback(() => {
    props.onChange('');
  }, [props]);

  return (
    <>
      {props.label && <label className="text-sm">{props.label}</label>}
      <Listbox
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}>
        <div className={twMerge('relative', props.className)}>
          <Listbox.Button className="border-primary/50 relative h-8 w-full cursor-default rounded  border-2 bg-white/50 pl-3 pr-10 text-left focus:outline-none disabled:opacity-30">
            <span className="block truncate">{selectedLabel}</span>

            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <PiCaretUpDown className="text-sm" />
            </span>
          </Listbox.Button>
          {props.clearable && props.value !== '' && (
            <span className="absolute inset-y-0 right-6 flex items-center pr-2">
              <button onClick={onClear}>
                <PiX className="text-sm" />
              </button>
            </span>
          )}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <Listbox.Options className="ring-primary/50  absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 focus:outline-none sm:text-sm">
              {props.options.map((option, idx) => (
                <Listbox.Option
                  key={idx}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'text-aws-primary bg-primary/10' : ''
                    }`
                  }
                  value={option.value}>
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span className="text-aws-smile absolute inset-y-0 left-0 flex items-center pl-3">
                          <PiCheck className="h-5 w-5" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </>
  );
};

export default Select;
