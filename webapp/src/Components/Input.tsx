import {
  Input as AntdInput,
  InputProps as AntdInputProps,
  InputRef,
  Tooltip,
} from "antd";
import classNames from "classnames";
import React, { useEffect, useState } from "react";

import { RuleType, useValidation } from "../hooks";

import "./Input.css";

export type InputProps = Omit<AntdInputProps, "onChange"> & {
  onChange?: (value: string) => void;
  value: string;
  rules?: RuleType<string>[];
};

export const Input = React.forwardRef(
  (props: InputProps, ref?: React.Ref<InputRef>) => {
    const {
      rules,
      value: defaultValue,
      onChange,
      className,
      suffix = <span />,
      ...others
    } = props;

    const [value, setValue] = useState(defaultValue);
    const invalid = useValidation<string>(value, rules);

    useEffect(() => {
      setValue(defaultValue);
    }, [defaultValue]);

    const handleValueChange = (value: string) => {
      setValue(value);
    };

    const changeValue = () => {
      const v = invalid
        ? invalid.defaultValue === undefined
          ? defaultValue
          : invalid.defaultValue
        : value;
      handleValueChange(v);
      onChange?.(v);
    };

    return (
      <AntdInput
        className={classNames("validation-input", className, {
          error: invalid,
        })}
        ref={ref}
        {...others}
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        onBlur={changeValue}
        onPressEnter={changeValue}
        suffix={
          invalid ? (
            <Tooltip
              arrowPointAtCenter={true}
              title={invalid.message}
              placement="topRight"
              overlayClassName="input-error-tip"
            >
              <div>出错了</div>
            </Tooltip>
          ) : (
            suffix
          )
        }
      />
    );
  }
);
