// app/components/admin/customers/CustomerStats.tsx
import { Row, Col, Card, Statistic } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "@/lib/hook/useTranslation";

interface CustomerStatsProps {
  totalCustomers: number;
  activeCustomersOrders: number; // customers with orders
  activeCustomersStatus: number; // customers with status === "active"
  thisMonth: number;
}

export function CustomerStats({
  totalCustomers,
  activeCustomersOrders,
  activeCustomersStatus,
  thisMonth,
}: CustomerStatsProps) {
  const t = useTranslation();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title={t.admin.customerTotalStat}
            value={totalCustomers}
            prefix={<TeamOutlined />}
            styles={{
              content: {
                color: "#1890ff",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title={t.admin.customerActiveOrders}
            value={activeCustomersOrders}
            prefix={<CheckCircleOutlined />}
            styles={{
              content: {
                color: "#52c41a",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title={t.admin.customerActiveStatus}
            value={activeCustomersStatus}
            prefix={<UserOutlined />}
            styles={{
              content: {
                color: "#faad14",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title={t.admin.customerThisMonth}
            value={thisMonth}
            prefix={<RiseOutlined />}
            styles={{
              content: {
                color: "#722ed1",
              },
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
