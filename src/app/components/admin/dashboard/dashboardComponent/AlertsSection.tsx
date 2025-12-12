"use client";

import React from 'react';
import { Card, Button } from 'antd';
import {
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface AlertsSectionProps {
  alerts: {
    type: 'stock' | 'order' | 'payment';
    message: string;
    count: number;
  }[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stock': return <ExclamationCircleOutlined className="text-amber-500" />;
      case 'order': return <ClockCircleOutlined className="text-red-500" />;
      case 'payment': return <WarningOutlined className="text-purple-500" />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-amber-50 border-amber-200';
      case 'order': return 'bg-red-50 border-red-200';
      case 'payment': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50';
    }
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div 
            key={idx} 
            className={`flex items-center justify-between p-3 rounded-lg ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-xl">
                {getAlertIcon(alert.type)}
              </div>
              <div>
                <div className="font-semibold">{alert.message}</div>
                <div className="text-sm text-gray-600">
                  {alert.count} item{alert.count > 1 ? 's' : ''} affected
                </div>
              </div>
            </div>
            <Button type="primary" size="small">
              Take Action
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AlertsSection;