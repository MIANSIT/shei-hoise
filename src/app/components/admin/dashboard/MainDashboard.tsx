"use client";

interface DashboardProps {
  name?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ name = "Admin" }) => {
  return (
    <div className="p-4 bg-black-100 rounded-md text-center">
      <h1 className="text-2xl font-bold text-white">Hello, {name}!</h1>
      <p className="text-white">Welcome to Shei Hoise E-com</p>
    </div>
  );
};
