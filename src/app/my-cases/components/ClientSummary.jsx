"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Clock,
  CircleDollarSign,
  FileCheck,
} from "lucide-react";

export default function ClientSummary({
  userData,
  cases,
  totalDebt,
  loading,
  selectedTab,
  selectedOrg,
  organizations,
}) {
  // 금액 포맷
  const formatCurrency = (amount) => {
    if (!amount) return "0원";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 선택된 조직 정보 가져오기
  const selectedOrgData =
    selectedTab === "organization" && selectedOrg
      ? organizations.find((org) => org.orgId === selectedOrg)
      : null;

  // 사용자의 조직 내 역할 가져오기
  const getUserRoleInOrg = () => {
    if (!selectedOrgData) return null;

    const orgMember = selectedOrgData.members?.find((member) => member.user_id === userData?.id);
    if (!orgMember) return "멤버";

    // role은 원문 그대로, position은 한글로 변환
    const roleMap = {
      admin: "관리자",
      staff: "직원",
      member: "멤버",
    };

    return {
      role: roleMap[orgMember.role] || orgMember.role,
      position: orgMember.position || "일반",
      isPrimary: orgMember.is_primary,
    };
  };

  const userRoleInOrg = getUserRoleInOrg();

  if (loading) {
    return (
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
        <CardHeader className="py-2 px-4 border-b">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 조직 프로필 표시
  if (selectedTab === "organization" && selectedOrgData) {
    return (
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
        <CardHeader className="py-2 px-4 border-b">
          <CardTitle className="text-base flex items-center">
            <Building2 className="h-4 w-4 mr-2 text-indigo-500" />
            조직 프로필
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-3 items-center mb-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-indigo-100">
                <Building2 className="h-6 w-6 text-indigo-700" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                <h3 className="text-base font-semibold mr-2">
                  {selectedOrgData.orgName || "조직명"}
                </h3>
                {userRoleInOrg && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      userRoleInOrg.isPrimary ? "bg-amber-100 text-amber-700 border-amber-200" : ""
                    }`}
                  >
                    {userRoleInOrg.position} ({userRoleInOrg.role})
                    {userRoleInOrg.isPrimary && " · 주담당자"}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center">
                {selectedOrgData.organization?.email && (
                  <div className="flex items-center mr-3">
                    <Mail className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-[160px]">
                      {selectedOrgData.organization.email}
                    </span>
                  </div>
                )}
                {selectedOrgData.organization?.phone && (
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    <span>{selectedOrgData.organization.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {cases?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">전체 사건</div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {
                  (cases?.filter((c) => c.status === "active" || c.status === "in_progress") || [])
                    .length
                }
              </div>
              <div className="text-xs text-muted-foreground">진행중</div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <CircleDollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(totalDebt).replace("₩", "")}
              </div>
              <div className="text-xs text-muted-foreground">총 채권액</div>
            </div>
          </div>

          {selectedOrgData.organization?.business_number && (
            <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-xs">
              <div className="flex items-center text-muted-foreground">
                <FileCheck className="h-3 w-3 mr-1" />
                <span>사업자등록번호: {selectedOrgData.organization.business_number}</span>
              </div>
              {selectedOrgData.organization?.representative_name && (
                <div className="flex items-center mt-1 text-muted-foreground">
                  <User className="h-3 w-3 mr-1" />
                  <span>대표자: {selectedOrgData.organization.representative_name}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 개인 프로필 표시 (기존 코드)
  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-md h-full">
      <CardHeader className="py-2 px-4 border-b">
        <CardTitle className="text-base flex items-center">
          <User className="h-4 w-4 mr-2 text-blue-500" />내 프로필
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex gap-3 items-center mb-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={userData?.profile_image} alt={userData?.name} />
            <AvatarFallback className="bg-blue-100">
              <User className="h-6 w-6 text-blue-700" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <h3 className="text-base font-semibold mr-2">{userData?.name || "사용자"}</h3>
              <Badge variant="outline" className="text-xs">
                {userData?.role === "staff" ? "변호사" : "회원"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              {userData?.email && (
                <div className="flex items-center mr-3">
                  <Mail className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[160px]">{userData.email}</span>
                </div>
              )}
              {userData?.phone && (
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  <span>{userData.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {cases?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">전체 사건</div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {
                (cases?.filter((c) => c.status === "active" || c.status === "in_progress") || [])
                  .length
              }
            </div>
            <div className="text-xs text-muted-foreground">진행중</div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <CircleDollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalDebt).replace("₩", "")}
            </div>
            <div className="text-xs text-muted-foreground">총 채권액</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
