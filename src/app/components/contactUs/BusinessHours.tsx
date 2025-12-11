"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export interface BusinessHour {
  day: string;
  hours: string; // e.g., "10:00 AM – 8:00 PM"
  closed?: boolean; // optional
}

type Status = "open" | "closingSoon" | "closed";

interface BusinessHoursProps {
  businessHours: BusinessHour[];
}

export default function BusinessHours({ businessHours }: BusinessHoursProps) {
  const [currentStatus, setCurrentStatus] = useState<Record<string, Status>>(
    {}
  );

  const parseTime = (time: string) => {
    const [hourMin, period] = time.split(" ");
    const [hour, min] = hourMin.split(":").map(Number);
    let finalHour = hour;

    if (period === "PM" && hour !== 12) finalHour += 12;
    if (period === "AM" && hour === 12) finalHour = 0;

    return { hour: finalHour, min };
  };

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const status: Record<string, Status> = {};

      businessHours.forEach((item) => {
        if (item.closed === true || item.hours.toLowerCase() === "closed") {
          status[item.day] = "closed";
          return;
        }

        const [start, end] = item.hours.split("–").map((h) => h.trim());
        const { hour: startH, min: startM } = parseTime(start);
        const { hour: endH, min: endM } = parseTime(end);

        const startTime = new Date();
        startTime.setHours(startH, startM, 0, 0);

        const endTime = new Date();
        endTime.setHours(endH, endM, 0, 0);

        const diff = endTime.getTime() - now.getTime();

        if (now >= startTime && now <= endTime) {
          status[item.day] = diff <= 60 * 60 * 1000 ? "closingSoon" : "open"; // last 1 hour = closingSoon
        } else {
          status[item.day] = "closed";
        }
      });

      setCurrentStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60 * 1000); // every minute

    return () => clearInterval(interval);
  }, [businessHours]);

  const getColor = (status: Status) => {
    switch (status) {
      case "open":
        return "text-green-500 dark:text-green-400";
      case "closingSoon":
        return "text-yellow-500 dark:text-yellow-400";
      case "closed":
        return "text-red-500 dark:text-red-400";
    }
  };

  return (
    <div className="rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-zinc-700 p-6 bg-white dark:bg-zinc-800">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Clock className="w-6 h-6" /> Business Hours
      </h3>
      <div className="space-y-2">
        {businessHours.map((item) => (
          <p
            key={item.day}
            className="flex justify-between text-gray-600 dark:text-gray-400"
          >
            <span>{item.day}</span>
            <span
              className={`${getColor(
                currentStatus[item.day] || "closed"
              )} font-bold`}
            >
              {item.hours}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
