import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { Plus, Trash2, AlertCircle, PlusCircle, InfoIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function BasicInfoSection({ formData, setFormData }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      filing_date: date,
    }));
  };

  // 이자 추가 함수
  const addInterest = () => {
    if (formData.interests.length >= 2) {
      toast.error("이자는 최대 2개까지만 추가할 수 있습니다");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      interests: [
        ...prev.interests,
        {
          start_date: null, // 기산일
          end_date: null, // 종기일
          rate: "", // 이자율
        },
      ],
    }));

    toast.success("이자 항목이 추가되었습니다");
  };

  // 이자 삭제 함수
  const removeInterest = (index) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests.splice(index, 1);
      return {
        ...prev,
        interests: updatedInterests,
      };
    });

    toast.info("이자 항목이 삭제되었습니다");
  };

  // 이자 정보 변경 함수
  const handleInterestChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests[index] = {
        ...updatedInterests[index],
        [field]: value,
      };
      return {
        ...prev,
        interests: updatedInterests,
      };
    });
  };

  // 이자 날짜 변경 함수
  const handleInterestDateChange = (index, field, date) => {
    setFormData((prev) => {
      const updatedInterests = [...prev.interests];
      updatedInterests[index] = {
        ...updatedInterests[index],
        [field]: date,
      };
      return {
        ...prev,
        interests: updatedInterests,
      };
    });
  };

  // 비용 추가 함수
  const addExpense = (type) => {
    // 기타 옵션인 경우 직접 입력 처리
    if (type === "기타") {
      setFormData((prev) => ({
        ...prev,
        expenses: [
          ...prev.expenses,
          {
            expense_type: "기타",
            custom_type: "", // 사용자 정의 비용 유형
            amount: "", // 금액
          },
        ],
      }));

      toast.success("기타 비용 항목이 추가되었습니다");
      return;
    }

    // 이미 해당 유형의 비용이 있는지 확인
    const existingExpense = formData.expenses.find((expense) => expense.expense_type === type);

    if (existingExpense) {
      toast.error("이미 추가된 비용 유형입니다", {
        description: `${type}은(는) 이미 추가되어 있습니다.`,
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          expense_type: type, // 비용 유형 (서기료, 송달료, 인지액, 예납금)
          amount: "", // 금액
        },
      ],
    }));

    toast.success(`${type} 항목이 추가되었습니다`);
  };

  // 비용 삭제 함수
  const removeExpense = (index) => {
    setFormData((prev) => {
      const updatedExpenses = [...prev.expenses];
      updatedExpenses.splice(index, 1);
      return {
        ...prev,
        expenses: updatedExpenses,
      };
    });

    toast.info("비용 항목이 삭제되었습니다");
  };

  // 비용 정보 변경 함수
  const handleExpenseChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedExpenses = [...prev.expenses];
      updatedExpenses[index] = {
        ...updatedExpenses[index],
        [field]: value,
      };
      return {
        ...prev,
        expenses: updatedExpenses,
      };
    });
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
          기본 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 사건 유형 */}
          <div className="space-y-2">
            <Label htmlFor="case_type" className="flex items-center text-sm font-medium">
              사건 유형
              <span className="text-red-500 ml-1">*</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 ml-1 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      사건 유형에 따라 당사자 정보가 다르게 표시됩니다
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              value={formData.case_type}
              onValueChange={(value) => handleSelectChange("case_type", value)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                <SelectValue placeholder="사건 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debt">
                  <div className="flex items-center">
                    <Badge className="mr-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200">
                      채권
                    </Badge>
                    채권
                  </div>
                </SelectItem>
                <SelectItem value="lawsuit">
                  <div className="flex items-center">
                    <Badge className="mr-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200">
                      소송
                    </Badge>
                    소송
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상태 */}
          <div className="space-y-2">
            <Label htmlFor="status" className="flex items-center text-sm font-medium">
              상태
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange("status", value)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="mr-2 border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                    >
                      대기중
                    </Badge>
                    대기중
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="mr-2 border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                    >
                      진행중
                    </Badge>
                    진행중
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="mr-2 border-green-300 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
                    >
                      완료
                    </Badge>
                    완료
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="mr-2 border-red-300 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
                    >
                      취소
                    </Badge>
                    취소
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 접수일 */}
          <div className="space-y-2">
            <Label htmlFor="filing_date" className="text-sm font-medium">
              접수일
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white dark:bg-gray-800",
                    !formData.filing_date && "text-muted-foreground"
                  )}
                >
                  {formData.filing_date ? (
                    format(formData.filing_date, "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.filing_date}
                  onSelect={handleDateChange}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 수임원금 */}
        <div className="space-y-2">
          <Label htmlFor="principal_amount" className="text-sm font-medium">
            수임원금
          </Label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                id="principal_amount"
                name="principal_amount"
                type="number"
                value={formData.principal_amount}
                onChange={handleInputChange}
                className="pl-12 pr-16 bg-white dark:bg-gray-800"
                min="0"
                max="999999999999"
              />
              <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                ₩
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
                원
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInterest}
              disabled={formData.interests.length >= 2}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
              이자 추가
            </Button>
          </div>
        </div>

        {/* 이자 정보 입력 필드 */}
        {formData.interests.map((interest, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 relative bg-gray-50/50 dark:bg-gray-800/50"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={() => removeInterest(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">기산일</Label>
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
                        format(interest.start_date, "PPP", { locale: ko })
                      ) : (
                        <span>날짜 선택</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={interest.start_date}
                      onSelect={(date) => handleInterestDateChange(index, "start_date", date)}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">종기일</Label>
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
                        format(interest.end_date, "PPP", { locale: ko })
                      ) : (
                        <span>날짜 선택</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={interest.end_date}
                      onSelect={(date) => handleInterestDateChange(index, "end_date", date)}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">이자율</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={interest.rate}
                    onChange={(e) => handleInterestChange(index, "rate", e.target.value)}
                    placeholder="이자율"
                    className="pr-8 bg-white dark:bg-gray-800"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 비용 추가 버튼 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">비용</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addExpense("서기료")}
              disabled={formData.expenses.some((e) => e.expense_type === "서기료")}
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
              disabled={formData.expenses.some((e) => e.expense_type === "송달료")}
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
              disabled={formData.expenses.some((e) => e.expense_type === "인지액")}
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
              disabled={formData.expenses.some((e) => e.expense_type === "예납금")}
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
        </div>

        {/* 비용 정보 입력 필드 */}
        {formData.expenses.map((expense, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 relative bg-gray-50/50 dark:bg-gray-800/50"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={() => removeExpense(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              {expense.expense_type === "기타" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">비용 유형</Label>
                  <Input
                    type="text"
                    value={expense.custom_type || ""}
                    onChange={(e) => handleExpenseChange(index, "custom_type", e.target.value)}
                    placeholder="비용 유형 입력"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{expense.expense_type}</Label>
                  <div className="h-10 flex items-center px-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    {expense.expense_type}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">금액</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => handleExpenseChange(index, "amount", e.target.value)}
                    placeholder="금액"
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
