"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, Building2, Trash2, Edit, Save, X, Loader2, Phone, Mail, MapPin, CreditCard 
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";

export default function ClientDetailModal({ open, onOpenChange, clients, onRemoveClient, user }) {
  const [editingClientId, setEditingClientId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    resident_number: "",
    position: ""
  });

  // 💡 수정 모드 켜기
  const startEditing = (client) => {
    setEditingClientId(client.id);
    setFormData({
      name: client.client_type === "individual" ? client.individual_name : client.organization_name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      resident_number: client.client_type === "individual" ? (client.resident_number || "") : (client.business_number || ""),
      position: client.position || ""
    });
  };

  // 💡 수정 취소
  const cancelEditing = () => {
    setEditingClientId(null);
  };

  // 💡 DB에 수정된 정보 저장
  const handleUpdate = async (client) => {
    if (!formData.name.trim()) {
      toast.error("이름/기업명을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 개인/법인 원본 테이블 업데이트
      if (client.client_type === "individual") {
        const { error } = await supabase.from("users").update({
          name: formData.name,
          phone_number: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          resident_number: formData.resident_number || null
        }).eq("id", client.individual_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("test_organizations").update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          business_number: formData.resident_number || null // DB 컬럼 맵핑
        }).eq("id", client.organization_id);
        if (error) throw error;
      }

      // 2. 이 사건에서의 직책(포지션) 업데이트
      if (formData.position !== client.position) {
        const { error: linkError } = await supabase.from("test_case_clients").update({
          position: formData.position || null
        }).eq("id", client.id);
        if (linkError) throw linkError;
      }

      toast.success("의뢰인 정보가 성공적으로 수정되었습니다.");
      setEditingClientId(null);
      
      // 💡 수정된 데이터를 화면에 즉시 반영하기 위해 깔끔하게 새로고침
      window.location.reload();
    } catch (error) {
      console.error("의뢰인 수정 실패:", error);
      toast.error("정보 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>의뢰인 상세 정보</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {clients.map((client) => {
            const isEditing = editingClientId === client.id;
            const isIndividual = client.client_type === "individual";

            return (
              <Card key={client.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4">
                  {isEditing ? (
                    /* ---------------------------------------------------- */
                    /* ✏️ 수정 모드 UI                                      */
                    /* ---------------------------------------------------- */
                    <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                        {isIndividual ? <User className="h-5 w-5 text-blue-500" /> : <Building2 className="h-5 w-5 text-amber-500" />}
                        <span className="font-semibold text-base">{isIndividual ? "개인 의뢰인 정보 수정" : "기업 의뢰인 정보 수정"}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{isIndividual ? "이름" : "기업명"} <span className="text-red-500">*</span></Label>
                          <Input size="sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">연락처</Label>
                          <Input size="sm" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">이메일</Label>
                          <Input size="sm" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{isIndividual ? "주민등록번호" : "사업자등록번호"}</Label>
                          <Input size="sm" value={formData.resident_number} onChange={(e) => setFormData({...formData, resident_number: e.target.value})} className="h-8" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-muted-foreground">주소</Label>
                          <Input size="sm" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-8" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-muted-foreground">사건 내 직책/역할 (예: 원고, 피고 등)</Label>
                          <Input size="sm" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} className="h-8" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSubmitting}>
                          <X className="h-4 w-4 mr-1" /> 취소
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(client)} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                          {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          저장하기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ---------------------------------------------------- */
                    /* 👀 조회 모드 UI (연락처, 주소 등 상세 표시 추가)        */
                    /* ---------------------------------------------------- */
                    <div className="flex items-start justify-between group">
                      <div className="flex items-start gap-4 w-full">
                        <div className={`p-2.5 rounded-full mt-1 shrink-0 ${isIndividual ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                          {isIndividual ? <User className="h-6 w-6 text-blue-600 dark:text-blue-400" /> : <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                              {isIndividual ? client.individual_name : client.organization_name}
                            </h3>
                            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900">
                              {isIndividual ? "개인" : "기업/단체"}
                            </Badge>
                            {client.position && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800">
                                {client.position}
                              </Badge>
                            )}
                          </div>
                          
                          {/* 💡 기존에 없던 상세 정보(연락처, 이메일 등) 노출 영역 */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 dark:text-gray-400">
                            {client.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            )}
                            {(isIndividual ? client.resident_number : client.business_number) && (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span>{isIndividual ? client.resident_number : client.business_number}</span>
                              </div>
                            )}
                            {client.address && (
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{client.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      {user && (user.role === "admin" || user.role === "staff") && (
                        <div className="flex gap-1 ml-2 shrink-0 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => startEditing(client)}
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => onRemoveClient(client.id)}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {clients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
              등록된 의뢰인이 없습니다.
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}