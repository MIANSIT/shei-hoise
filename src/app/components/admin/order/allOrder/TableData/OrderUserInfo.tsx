"use client";

import React from "react";
import { Avatar, Space } from "antd";

interface Props {
  name: string;
  email: string;
  avatar?: string;
}

const OrderUserInfo: React.FC<Props> = ({ name, email, avatar }) => (
  <Space>
    <Avatar src={avatar} />
    <div>
      <div className="font-medium">{name}</div>
      <div className="text-gray-500 text-xs">{email}</div>
    </div>
  </Space>
);

export default OrderUserInfo;
