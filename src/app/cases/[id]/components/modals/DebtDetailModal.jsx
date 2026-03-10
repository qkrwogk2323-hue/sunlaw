"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Edit, Save, Plus, Trash2, PlusCircle, CalculatorIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function DebtDetailModal({ open, onOpenChange, caseData, user, onUpdateDebtInfo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interests, setInterests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    if (caseData) {
      setPrincipalAmount(caseData.principal_amount || "");
      setInterests(caseData.interests || []);
      setExpenses(caseData.expenses || []);
    }
  }, [caseData, open]);

  // 금액 형식화 함수
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";
    return new Intl.NumberFormat("ko-KR").format(Number(amount));
  };

  // 총 채권금액 계산
  const calculateTotalAmount = () => {
    const principal = Number(principalAmount || 0);

    // 이자 금액 합계 - 이제 페이지에서 이미 계산된 값을 사용
    const interestAmount =
      interests?.reduce((sum, interest) => {
        return sum + Number(interest.amount || 0);
      }, 0) || 0;

    // 비용 금액 합계
    const expenseAmount =
      expenses?.reduce((sum, expense) => {
        return sum + Number(expense.amount || 0);
      }, 0) || 0;

    return principal + interestAmount + expenseAmount;
  };

  // 이자 계산 함수
  const calculateInterest = (principal, rate, startDate, endDate) => {
    if (!principal || !rate || !startDate || !endDate) return 0;

    const days = differenceInDays(new Date(endDate), new Date(startDate));
    if (days <= 0) return 0;

    // 일할 계산: 원금 * 이자율 * (일수 / 365)
    const interest = Number(principal) * (Number(rate) / 100) * (days / 365);
    return Math.round(interest);
  };

  // 이자 자동 계산 적용
  const calculateAndApplyInterest = (index) => {
    const interest = interests[index];
    if (!interest.start_date || !interest.end_date || !interest.rate) {
      toast.error("기산일, 종기일, 이자율을 모두 입력해주세요");
      return;
    }

    const calculatedAmount = calculateInterest(
      principalAmount,
      interest.rate,
      interest.start_date,
      interest.end_date
    );

    handleInterestChange(index, "amount", calculatedAmount.toString());
    toast.success("이자가 계산되었습니다");
  };

  // 이자 정보 변경 함수
  const handleInterestChange = (index, field, value) => {
    const updatedInterests = [...interests];
    updatedInterests[index] = {
      ...updatedInterests[index],
      [field]: value,
    };
    setInterests(updatedInterests);
  };

  // 이자 날짜 변경 함수
  const handleInterestDateChange = (index, field, date) => {
    const updatedInterests = [...interests];
    updatedInterests[index] = {
      ...updatedInterests[index],
      [field]: date,
    };
    setInterests(updatedInterests);
  };

  // 비용 정보 변경 함수
  const handleExpenseChange = (index, field, value) => {
    const updatedExpenses = [...expenses];
    updatedExpenses[index] = {
      ...updatedExpenses[index],
      [field]: value,
    };
    setExpenses(updatedExpenses);
  };

  // 이자 추가 함수
  const addInterest = () => {
    if (interests.length >= 2) {
      toast.error("이자는 최대 2개까지만 추가할 수 있습니다");
      return;
    }

    const today = new Date();

    setInterests([
      ...interests,
      {
        start_date: null, // 기산일
        end_date: today, // 종기일 기본값: 오늘
        rate: "", // 이자율
        amount: "", // 이자 금액
      },
    ]);

    toast.success("이자 항목이 추가되었습니다");
  };

  // 이자 삭제 함수
  const removeInterest = (index) => {
    const updatedInterests = [...interests];
    updatedInterests.splice(index, 1);
    setInterests(updatedInterests);

    toast.info("이자 항목이 삭제되었습니다");
  };

  // 비용 추가 함수
  const addExpense = (type) => {
    // 기타 옵션인 경우 직접 입력 처리
    if (type === "기타") {
      setExpenses([
        ...expenses,
        {
          expense_type: "기타",
          custom_type: "", // 사용자 정의 비용 유형
          amount: "", // 금액
        },
      ]);

      toast.success("기타 비용 항목이 추가되었습니다");
      return;
    }

    // 이미 해당 유형의 비용이 있는지 확인
    const existingExpense = expenses.find((expense) => expense.expense_type === type);

    if (existingExpense) {
      toast.error("이미 추가된 비용 유형입니다", {
        description: `${type}은(는) 이미 추가되어 있습니다.`,
      });
      return;
    }

    setExpenses([
      ...expenses,
      {
        expense_type: type, // 비용 유형 (서기료, 송달료, 인지액, 예납금)
        amount: "", // 금액
      },
    ]);

    toast.success(`${type} 항목이 추가되었습니다`);
  };

  // 비용 삭제 함수
  const removeExpense = (index) => {
    const updatedExpenses = [...expenses];
    updatedExpenses.splice(index, 1);
    setExpenses(updatedExpenses);

    toast.info("비용 항목이 삭제되었습니다");
  };

  // 변경 사항 저장
  const saveChanges = async () => {
    try {
      setIsLoading(true);
      await onUpdateDebtInfo({
        principal_amount: principalAmount,
        interests: interests,
        expenses: expenses,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("채권 정보 업데이트 실패:", error);
      toast.error("채권 정보 업데이트에 실패했습니다", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 커스텀 비용 유형 변경
  const handleCustomTypeChange = (index, value) => {
    const updatedExpenses = [...expenses];
    updatedExpenses[index] = {
      ...updatedExpenses[index],
      custom_type: value,
    };
    setExpenses(updatedExpenses);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>채권금액 상세 정보</span>
            {user && (user.role === "admin" || user.role === "staff") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isLoading}
              >
                {isEditing ? (
                  "취소"
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" /> 수정
                  </>
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 총 채권금액 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">총 채권금액</Label>
            <div className="text-2xl font-bold">{formatCurrency(calculateTotalAmount())} 원</div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* 수임원금 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">수임원금</Label>
            {isEditing ? (
              <div className="relative">
                <Input
                  type="number"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="pl-12 pr-16 bg-white dark:bg-gray-800"
                />
                <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                  ₩
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
                  원
                </div>
              </div>
            ) : (
              <div className="text-xl">{formatCurrency(principalAmount)} 원</div>
            )}
          </div>

          {/* 이자 정보 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">이자</Label>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInterest}
                  disabled={interests.length >= 2}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
                  이자 추가
                </Button>
              )}
            </div>
            {interests && interests.length > 0 ? (
              interests.map((interest, index) => (
                <Card key={index} className="overflow-hidden relative">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={() => removeInterest(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <CardContent className={`p-4 ${isEditing ? "pr-12" : ""}`}>
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">기산일</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-white dark:bg-gray-800",
                                  !interest.start_date && "text-muted-foreground"
                                )}
                              >
                                {interest.start_date ? (
                                  format(new Date(interest.start_date), "PPP", { locale: ko })
                                ) : (
                                  <span>날짜 선택</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={
                                  interest.start_date ? new Date(interest.start_date) : null
                                }
                                onSelect={(date) =>
                                  handleInterestDateChange(index, "start_date", date)
                                }
                                initialFocus
                                locale={ko}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">종기일</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-white dark:bg-gray-800",
                                  !interest.end_date && "text-muted-foreground"
                                )}
                              >
                                {interest.end_date ? (
                                  format(new Date(interest.end_date), "PPP", { locale: ko })
                                ) : (
                                  <span>날짜 선택</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={interest.end_date ? new Date(interest.end_date) : null}
                                onSelect={(date) =>
                                  handleInterestDateChange(index, "end_date", date)
                                }
                                initialFocus
                                locale={ko}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">이자율 (%)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={interest.rate || ""}
                              onChange={(e) => handleInterestChange(index, "rate", e.target.value)}
                              className="pr-8 bg-white dark:bg-gray-800"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                              %
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-xs">이자 금액</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={interest.amount || ""}
                              onChange={(e) =>
                                handleInterestChange(index, "amount", e.target.value)
                              }
                              className="pl-12 pr-16 bg-white dark:bg-gray-800"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                              ₩
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
                              원
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-xs invisible">자동계산</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                                  onClick={() => calculateAndApplyInterest(index)}
                                  disabled={
                                    !interest.start_date ||
                                    !interest.end_date ||
                                    !interest.rate ||
                                    !principalAmount
                                  }
                                >
                                  <CalculatorIcon className="mr-2 h-4 w-4 text-blue-500" />
                                  자동계산
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">원금 × 이자율 × (일수 ÷ 365)로 계산됩니다</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">기간:</span>
                          <span className="text-sm">
                            {interest.start_date &&
                              format(new Date(interest.start_date), "yyyy.MM.dd", { locale: ko })}
                            {interest.start_date && interest.end_date && " ~ "}
                            {interest.end_date &&
                              format(new Date(interest.end_date), "yyyy.MM.dd", { locale: ko })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">이자율:</span>
                          <span className="text-sm">{interest.rate}%</span>
                        </div>
                        {interest.amount && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">금액:</span>
                            <span className="text-sm">{formatCurrency(interest.amount)} 원</span>
                          </div>
                        )}
                        {interest.start_date && interest.end_date && (
                          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <span className="text-xs">
                              {differenceInDays(
                                new Date(interest.end_date),
                                new Date(interest.start_date)
                              )}
                              일
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">등록된 이자 정보가 없습니다.</div>
            )}
          </div>

          {/* 비용 정보 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">비용</Label>

            {/* 비용 추가 버튼 */}
            {isEditing && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense("서기료")}
                  disabled={expenses.some((e) => e.expense_type === "서기료")}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4 text-blue-500" />
                  서기료
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense("송달료")}
                  disabled={expenses.some((e) => e.expense_type === "송달료")}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                  송달료
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense("인지액")}
                  disabled={expenses.some((e) => e.expense_type === "인지액")}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4 text-purple-500" />
                  인지액
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense("예납금")}
                  disabled={expenses.some((e) => e.expense_type === "예납금")}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4 text-amber-500" />
                  예납금
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense("기타")}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4 text-gray-500" />
                  기타
                </Button>
              </div>
            )}

            {expenses && expenses.length > 0 ? (
              expenses.map((expense, index) => (
                <Card key={index} className="overflow-hidden relative">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={() => removeExpense(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <CardContent className={`p-4 ${isEditing ? "pr-12" : ""}`}>
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">비용 유형</Label>
                          {expense.expense_type === "기타" ? (
                            <Input
                              type="text"
                              value={expense.custom_type || ""}
                              onChange={(e) => handleCustomTypeChange(index, e.target.value)}
                              placeholder="비용 유형 입력"
                              className="bg-white dark:bg-gray-800"
                            />
                          ) : (
                            <div className="h-10 flex items-center px-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                              {expense.expense_type}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">금액</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={expense.amount || ""}
                              onChange={(e) => handleExpenseChange(index, "amount", e.target.value)}
                              className="pl-12 pr-16 bg-white dark:bg-gray-800"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                              ₩
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
                              원
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {expense.expense_type === "기타"
                            ? expense.custom_type
                            : expense.expense_type}
                          :
                        </span>
                        <span className="text-sm">{formatCurrency(expense.amount)} 원</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">등록된 비용 정보가 없습니다.</div>
            )}
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <Button onClick={saveChanges} className="gap-2" disabled={isLoading}>
              {isLoading ? (
                "저장중..."
              ) : (
                <>
                  <Save className="h-4 w-4" /> 저장
                </>
              )}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
