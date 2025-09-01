"use client";

import React from "react";
import { Button } from "antd";
import type { ButtonProps } from "antd";

const SheiButton: React.FC<ButtonProps> = ({ children, ...rest }) => {
  return <Button {...rest}>{children}</Button>;
};

export default SheiButton;
