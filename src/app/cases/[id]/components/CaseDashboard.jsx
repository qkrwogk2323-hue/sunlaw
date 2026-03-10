import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import { supabase } from "@/utils/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarView from "@/components/Calendar";
import { BarChart3, DollarSign, PieChart, CreditCard, Percent } from "lucide-react";
import { toast } from "sonner";

export default function CaseDashboard({ caseId, caseData }) {
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recoveryData, setRecoveryData] = useState({
    principalAmount: caseData?.principal_amount || 0,
    totalAmount: 0,
    recoveredAmount: 0,
    recoveryRate: 0,
    isLoading: true,
  });

  useEffect(() => {
    calculateRecoveryData();
    fetchSchedules();
  }, [caseId]);

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const startDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString();

      const { data, error } = await supabase
        .from("test_schedules")
        .select("*")
        .eq("case_id", caseId)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      toast.error("일정 정보 조회에 실패했습니다");
    } finally {
      setLoadingSchedules(false);
    }
  };

  const calculateRecoveryData = async () => {
    setRecoveryData((prev) => ({ ...prev, isLoading: true }));
    try {
      const { data: recoveryData, error: recoveryError } = await supabase
        .from("test_recovery_activities")
        .select("amount")
        .eq("case_id", caseId)
        .eq("activity_type", "payment")
        .eq("status", "completed");

      if (recoveryError) throw recoveryError;

      const { data: interestData, error: interestError } = await supabase
        .from("test_case_interests")
        .select("*")
        .eq("case_id", caseId);

      if (interestError) throw interestError;

      const { data: expenseData, error: expenseError } = await supabase
        .from("test_case_expenses")
        .select("amount")
        .eq("case_id", caseId);

      if (expenseError) throw expenseError;

      const interestAmount = interestData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const expenseAmount = expenseData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const principalAmount = caseData?.principal_amount || 0;
      const totalAmount = principalAmount + interestAmount + expenseAmount;
      const recoveredAmount = recoveryData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const recoveryRate = totalAmount > 0 ? (recoveredAmount / totalAmount) * 100 : 0;

      setRecoveryData({
        principalAmount,
        totalAmount,
        recoveredAmount,
        recoveryRate,
        isLoading: false,
      });
    } catch (error) {
      setRecoveryData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleAddSchedule = (date) => {
    toast.info("일정 추가 기능은 준비 중입니다");
  };

  const handleToggleScheduleCompletion = async (schedule) => {
    try {
      const { error } = await supabase
        .from("test_schedules")
        .update({ is_completed: !schedule.is_completed })
        .eq("id", schedule.id);

      if (error) throw error;

      toast.success(`일정이 ${schedule.is_completed ? "미완료" : "완료"} 상태로 변경되었습니다`);
      fetchSchedules();
    } catch (error) {
      toast.error("일정 상태 변경에 실패했습니다");
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    try {
      const { error } = await supabase.from("test_schedules").delete().eq("id", schedule.id);

      if (error) throw error;

      toast.success("일정이 삭제되었습니다");
      fetchSchedules();
    } catch (error) {
      toast.error("일정 삭제에 실패했습니다");
    }
  };

  const handleViewSchedule = (schedule) => {
    // 일정 상세 보기 기능은 Calendar 컴포넌트 내에서 처리
  };

  const handleRefreshSchedules = (month) => {
    setCurrentMonth(month);
    fetchSchedules();
  };

  return (
    <div className="space-y-8">
      <Card className="border-0 bg-white/90 dark:bg-slate-900/90 shadow-md rounded-xl overflow-hidden backdrop-blur-sm">
        <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl font-bold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            채권 회수 현황
          </CardTitle>
          <CardDescription>이 사건의 채권 원금, 회수 금액 및 회수율을 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          {recoveryData.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    채권 원금
                  </span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(recoveryData.principalAmount)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center mb-2">
                  <PieChart className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    총 채권액
                  </span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(recoveryData.totalAmount)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center mb-2">
                  <CreditCard className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    회수 금액
                  </span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(recoveryData.recoveredAmount)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center mb-2">
                  <Percent className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    회수율
                  </span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {recoveryData.recoveryRate.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 pb-4">
          <div className="w-full mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">회수 진행률</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {recoveryData.recoveryRate.toFixed(1)}%
              </p>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(recoveryData.recoveryRate, 100)}%` }}
              />
            </div>
          </div>
        </CardFooter>
      </Card>

      <CalendarView
        schedules={schedules}
        onAddSchedule={handleAddSchedule}
        onEditSchedule={handleToggleScheduleCompletion}
        onDeleteSchedule={handleDeleteSchedule}
        onViewSchedule={handleViewSchedule}
        isLoading={loadingSchedules}
        onRefresh={handleRefreshSchedules}
        title="사건 일정 달력"
        description="소송 기일, 분납 일정 등을 달력 형태로 확인할 수 있습니다."
      />
    </div>
  );
}
