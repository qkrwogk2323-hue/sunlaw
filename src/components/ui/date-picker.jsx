"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * 날짜 선택기 컴포넌트
 * @param {Object} props
 * @param {Date|null} props.date - 선택된 날짜
 * @param {Function} props.setDate - 날짜를 설정하는 함수
 * @param {string} props.className - 추가 클래스명
 */
export function DatePicker({ date, setDate, className }) {
  const [selectedDate, setSelectedDate] = useState(date);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // 외부에서 date가 변경되면 내부 상태도 업데이트
  useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  // 달력에서 날짜를 선택했을 때 처리
  const handleSelect = (newDate) => {
    setSelectedDate(newDate);
    setDate(newDate);
    setIsPopoverOpen(false);
  };

  // 날짜 지우기
  const handleClear = () => {
    setSelectedDate(null);
    setDate(null);
    setIsPopoverOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} initialFocus />
          {selectedDate && (
            <div className="p-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={handleClear} className="w-full">
                날짜 지우기
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
