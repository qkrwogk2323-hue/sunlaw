"use client";

import React, { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  eachDayOfInterval,
  getDay,
  isSameMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  MoreHorizontal,
  Info,
  Edit,
  Trash2,
  AlertCircle,
  Gavel,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";

/**
 * 커스텀 달력 컴포넌트
 * @param {Array} schedules - 일정 데이터 배열
 * @param {Function} onAddSchedule - 일정 추가 버튼 클릭 시 호출될 함수
 * @param {Function} onEditSchedule - 일정 수정 시 호출될 함수
 * @param {Function} onDeleteSchedule - 일정 삭제 시 호출될 함수
 * @param {Function} onViewSchedule - 일정 상세 보기 시 호출될 함수
 * @param {Boolean} isLoading - 로딩 상태
 * @param {Function} onRefresh - 새로고침 버튼 클릭 시 호출될 함수
 * @param {String} title - 캘린더 제목
 * @param {String} description - 캘린더 설명
 */
const CalendarView = ({
  schedules = [],
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onViewSchedule,
  isLoading = false,
  onRefresh,
  title = "일정 달력",
  description = "소송 기일, 분납 일정 등을 달력 형태로 확인할 수 있습니다.",
}) => {
  // 상태 관리
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);

  // 현재 월의 달력 날짜 계산
  useEffect(() => {
    // 현재 월의 시작과 끝
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // 달력 시작일 (해당 월의 첫 주 일요일부터)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });

    // 달력 종료일 (해당 월의 마지막 주 토요일까지)
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    // 달력에 표시할 모든 날짜 계산
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    setCalendarDays(days);
  }, [currentMonth]);

  // 선택된 날짜 변경 시 해당 날짜의 일정 필터링
  useEffect(() => {
    if (selectedDay) {
      const eventsOnDay = schedules.filter((event) => {
        try {
          return event.event_date && isSameDay(parseISO(event.event_date), selectedDay);
        } catch (error) {
          return false;
        }
      });
      setSelectedDayEvents(eventsOnDay);
    } else {
      setSelectedDayEvents([]);
    }
  }, [selectedDay, schedules]);

  // 요일 이름 배열
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onRefresh) onRefresh(newMonth);
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onRefresh) onRefresh(newMonth);
  };

  // 이번 달로 이동
  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDay(now);
    if (onRefresh) onRefresh(now);
  };

  // 일정 유형에 따른 색상 지정
  const getEventColor = (eventType) => {
    switch (eventType) {
      case "court_date":
        return "bg-purple-500 dark:bg-purple-600";
      case "payment_date":
        return "bg-green-500 dark:bg-green-600";
      case "meeting":
        return "bg-blue-500 dark:bg-blue-600";
      case "deadline":
        return "bg-red-500 dark:bg-red-600";
      default:
        return "bg-gray-500 dark:bg-gray-600";
    }
  };

  // 일정 유형에 따른 아이콘 지정
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "court_date":
        return <Gavel className="h-3.5 w-3.5" />;
      case "payment_date":
        return <DollarSign className="h-3.5 w-3.5" />;
      case "meeting":
        return <Users className="h-3.5 w-3.5" />;
      case "deadline":
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <CalendarIcon className="h-3.5 w-3.5" />;
    }
  };

  // 일정 유형별 한글 이름
  const getEventTypeInKorean = (eventType) => {
    switch (eventType) {
      case "court_date":
        return "법원 기일";
      case "payment_date":
        return "납부일";
      case "meeting":
        return "미팅";
      case "deadline":
        return "마감일";
      default:
        return "일정";
    }
  };

  // 특정 날짜에 일정이 있는지 확인하고 일정 표시
  const getEventsForDate = (date) => {
    if (!date) return [];

    try {
      return schedules.filter(
        (event) => event.event_date && isSameDay(parseISO(event.event_date), date)
      );
    } catch (error) {
      console.error("일정 필터링 오류:", error);
      return [];
    }
  };

  // 일정 처리 함수들
  const handleAddSchedule = () => {
    if (onAddSchedule) {
      onAddSchedule(selectedDay || new Date());
    }
  };

  const handleEditSchedule = (schedule) => {
    if (onEditSchedule) {
      onEditSchedule(schedule);
    }
  };

  const handleDeleteSchedule = (schedule) => {
    if (onDeleteSchedule) {
      onDeleteSchedule(schedule);
    }
  };

  const handleViewSchedule = (schedule) => {
    if (onViewSchedule) {
      onViewSchedule(schedule);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh(currentMonth);
    }
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    setSelectedDay(date);
  };

  // 달력 UI 렌더링
  return (
    <Card className="border-0 bg-white/90 dark:bg-slate-900/90 shadow-md rounded-xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="text-xl font-bold flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToCurrentMonth} className="h-8">
                  오늘
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="text-lg font-medium">
                {format(currentMonth, "yyyy년 MM월", { locale: ko })}
              </h3>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  새로고침
                </Button>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-[400px] w-full rounded-lg" />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800 border-b">
                  {weekDays.map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "p-2 text-center text-sm font-medium",
                        index === 0 && "text-red-500", // 일요일
                        index === 6 && "text-blue-500" // 토요일
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 달력 그리드 */}
                <div className="grid grid-cols-7 auto-rows-fr bg-white dark:bg-slate-900">
                  {calendarDays.map((day, i) => {
                    const eventsOnDay = getEventsForDate(day);
                    const isCurrentMonthDay = isSameMonth(day, currentMonth);
                    const isSelectedDay = selectedDay && isSameDay(day, selectedDay);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "p-1 min-h-[70px] border-b border-r relative transition-colors cursor-pointer",
                          !isCurrentMonthDay && "opacity-40 bg-slate-50 dark:bg-slate-800/50",
                          isSelectedDay && "bg-blue-50 dark:bg-blue-900/20",
                          isTodayDate && "border-2 border-blue-400 dark:border-blue-600 z-10"
                        )}
                      >
                        <div className="flex flex-col h-full">
                          <div
                            className={cn(
                              "text-right pr-1 font-medium text-sm",
                              getDay(day) === 0 && "text-red-500", // 일요일
                              getDay(day) === 6 && "text-blue-500", // 토요일
                              isTodayDate && "text-blue-600 dark:text-blue-400 font-bold"
                            )}
                          >
                            {format(day, "d")}
                          </div>

                          {/* 일정 표시 */}
                          <div className="flex flex-col mt-1 gap-1 overflow-hidden">
                            {eventsOnDay.slice(0, 2).map((event, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "text-xs px-1 py-0.5 rounded truncate text-white",
                                  getEventColor(event.event_type)
                                )}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}

                            {eventsOnDay.length > 2 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                                +{eventsOnDay.length - 2}개 더...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="border rounded-lg p-4 h-full flex flex-col">
              <h3 className="font-medium text-lg mb-3 flex items-center">
                {selectedDay ? (
                  <div className="flex items-center justify-between w-full">
                    <span>{format(selectedDay, "yyyy년 MM월 dd일 (EEE)", { locale: ko })}</span>
                    {isToday(selectedDay) && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        오늘
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span>선택된 날짜 없음</span>
                )}
              </h3>

              <Separator className="my-2" />

              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-400">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">일정을 보려면 날짜를 선택하세요</p>
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-400">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">이 날에는 일정이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-1 flex-grow max-h-[400px]">
                  {selectedDayEvents.map((event) => (
                    <Dialog key={event.id}>
                      <DialogTrigger asChild>
                        <div className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-2">
                              <div
                                className={`rounded-full p-1.5 ${getEventColor(
                                  event.event_type
                                )} text-white`}
                              >
                                {getEventIcon(event.event_type)}
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <p className="font-medium text-sm">{event.title}</p>
                                  {event.is_important && (
                                    <AlertCircle className="h-3.5 w-3.5 ml-1 text-red-500" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {format(parseISO(event.event_date), "HH:mm", { locale: ko })}
                                  {event.location && ` · ${event.location}`}
                                </p>
                                {event.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48" align="end">
                                <div className="grid gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 justify-start"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewSchedule(event);
                                    }}
                                  >
                                    <Info className="h-3.5 w-3.5 mr-2" />
                                    자세히 보기
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 justify-start ${
                                      event.is_completed
                                        ? "text-orange-600 dark:text-orange-400"
                                        : "text-green-600 dark:text-green-400"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSchedule(event);
                                    }}
                                  >
                                    <Clock className="h-3.5 w-3.5 mr-2" />
                                    {event.is_completed ? "미완료로 변경" : "완료로 변경"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 justify-start text-red-600 dark:text-red-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSchedule(event);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    삭제
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {event.event_type === "court_date" && event.court_name && (
                            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                              <div className="flex items-center">
                                <Gavel className="h-3 w-3 mr-1 text-gray-500" />
                                <p className="text-xs text-gray-500">
                                  {event.court_name} {event.case_number && `(${event.case_number})`}
                                </p>
                              </div>
                            </div>
                          )}

                          {event.is_completed && (
                            <Badge
                              variant="outline"
                              className="mt-2 bg-green-50 text-green-700 border-green-200 text-xs"
                            >
                              완료됨
                            </Badge>
                          )}
                        </div>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center">
                            <div
                              className={`rounded-full p-1.5 ${getEventColor(
                                event.event_type
                              )} text-white mr-2`}
                            >
                              {getEventIcon(event.event_type)}
                            </div>
                            {event.title}
                            {event.is_important && (
                              <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                            )}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500">일정 유형</p>
                              <p className="text-sm">{getEventTypeInKorean(event.event_type)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">날짜 및 시간</p>
                              <p className="text-sm">
                                {format(parseISO(event.event_date), "yyyy년 MM월 dd일 HH:mm", {
                                  locale: ko,
                                })}
                              </p>
                            </div>
                          </div>

                          {event.location && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">장소</p>
                              <p className="text-sm">{event.location}</p>
                            </div>
                          )}

                          {event.description && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">설명</p>
                              <p className="text-sm whitespace-pre-line">{event.description}</p>
                            </div>
                          )}

                          {event.event_type === "court_date" && (
                            <>
                              {event.court_name && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500">법원</p>
                                  <p className="text-sm">{event.court_name}</p>
                                </div>
                              )}

                              {event.case_number && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500">사건번호</p>
                                  <p className="text-sm">{event.case_number}</p>
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex mt-2">
                            {event.is_completed ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                                완료됨
                              </Badge>
                            ) : (
                              <Badge variant="outline">진행중</Badge>
                            )}

                            {event.is_important && (
                              <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400">
                                중요
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            className={`${
                              event.is_completed
                                ? "text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/20"
                                : "text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20"
                            }`}
                            onClick={() => handleEditSchedule(event)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {event.is_completed ? "미완료로 변경" : "완료로 변경"}
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeleteSchedule(event)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            삭제
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 flex justify-end">
        <Button
          className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 hover:from-indigo-600 hover:to-blue-600"
          onClick={handleAddSchedule}
        >
          <CalendarIcon className="h-4 w-4 mr-1" />새 일정 추가
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CalendarView;
