"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  User,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  X,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
  Avatar,
  MessageSeparator,
  TypingIndicator,
  MessageGroup,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { ConversationList } from "./components/ConversationList";
import { ChatView } from "./components/ChatView";
import { ComposeDialog } from "./components/ComposeDialog";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";

export default function OpinionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opinions, setOpinions] = useState([]);
  const [selectedOpinion, setSelectedOpinion] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [currentTab, setCurrentTab] = useState("received");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: "",
    message: "",
    receiver_id: "",
    creditor_name: "",
    debtor_name: "",
    case_id: "",
  });
  const [receivers, setReceivers] = useState([]);
  const [cases, setCases] = useState([]);
  const [receiverCases, setReceiverCases] = useState([]);
  const [selectedOpinions, setSelectedOpinions] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messageEndRef = useRef(null);
  const replyInputRef = useRef(null);

  // 의견 목록 불러오기
  const fetchOpinions = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      // 받은 메시지와 보낸 메시지 모두 가져오기
      const { data: opinionsData, error } = await supabase
        .from("test_case_opinions")
        .select(
          `
          *,
          created_by_user:created_by(id, name, email),
          receiver:receiver_id(id, name, email),
          test_cases:case_id(
            id, 
            case_type, 
            status, 
            parties:test_case_parties(id, party_type, name, company_name, entity_type)
          )
        `
        )
        .or(`created_by.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 사건 정보가 있는 경우 채권자/채무자 정보 처리
      const processedOpinions =
        opinionsData?.map((opinion) => {
          if (opinion.test_cases) {
            const creditor = opinion.test_cases.parties?.find(
              (party) => party.party_type === "creditor"
            );
            const debtor = opinion.test_cases.parties?.find(
              (party) => party.party_type === "debtor"
            );

            // 이미 opinion에 creditor_name과 debtor_name이 있으면 그대로 사용, 없으면 parties에서 가져옴
            if (!opinion.creditor_name && creditor) {
              opinion.creditor_name =
                creditor.entity_type === "corporation" ? creditor.company_name : creditor.name;
            }

            if (!opinion.debtor_name && debtor) {
              opinion.debtor_name =
                debtor.entity_type === "corporation" ? debtor.company_name : debtor.name;
            }
          }
          return opinion;
        }) || [];

      setOpinions(processedOpinions);

      // 선택된 의견이 존재하는 경우 새로 불러온 데이터에서 해당 의견을 다시 선택
      if (selectedOpinion) {
        const updatedSelectedOpinion = processedOpinions.find((op) => op.id === selectedOpinion.id);
        if (updatedSelectedOpinion) {
          setSelectedOpinion(updatedSelectedOpinion);
        }
      }
    } catch (error) {
      console.error("의견 목록 불러오기 오류:", error);
      toast.error("의견 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 사용자 목록 불러오기
  const fetchReceivers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, position, role")
        .neq("id", user.id)
        .in("role", ["staff", "admin"]); // staff, admin 역할만 필터링

      if (error) throw error;
      setReceivers(data || []);
    } catch (error) {
      console.error("사용자 목록 불러오기 오류:", error);
    }
  };

  // 사건 목록 불러오기
  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("test_cases")
        .select(
          `
          id, 
          case_type, 
          status, 
          filing_date,
          parties:test_case_parties(id, party_type, name, company_name, entity_type)
        `
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      // 당사자 정보 처리
      const processedCases =
        data?.map((caseItem) => {
          const creditor = caseItem.parties?.find((party) => party.party_type === "creditor");
          const debtor = caseItem.parties?.find((party) => party.party_type === "debtor");

          // 당사자명 설정 (법인인 경우 회사명, 개인인 경우 이름)
          const creditorName = creditor
            ? creditor.entity_type === "corporation"
              ? creditor.company_name
              : creditor.name
            : "";
          const debtorName = debtor
            ? debtor.entity_type === "corporation"
              ? debtor.company_name
              : debtor.name
            : "";

          return {
            ...caseItem,
            creditor_name: creditorName,
            debtor_name: debtorName,
          };
        }) || [];

      setCases(processedCases);
    } catch (error) {
      console.error("사건 목록 불러오기 오류:", error);
    }
  };

  // 담당자가 담당하고 있는 사건 목록 불러오기
  const fetchHandlerCases = async (handlerId) => {
    if (!handlerId) {
      setReceiverCases([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("test_case_handlers")
        .select(
          `
          case_id,
          test_cases:case_id(
            id, 
            case_type, 
            status, 
            filing_date,
            parties:test_case_parties(id, party_type, name, company_name, entity_type)
          )
        `
        )
        .eq("user_id", handlerId);

      if (error) throw error;

      // 중복 제거 및 null 값 필터링
      const filteredCases = data
        .filter((item) => item.test_cases)
        .map((item) => {
          const caseItem = item.test_cases;
          const creditor = caseItem.parties?.find((party) => party.party_type === "creditor");
          const debtor = caseItem.parties?.find((party) => party.party_type === "debtor");

          // 당사자명 설정
          const creditorName = creditor
            ? creditor.entity_type === "corporation"
              ? creditor.company_name
              : creditor.name
            : "";
          const debtorName = debtor
            ? debtor.entity_type === "corporation"
              ? debtor.company_name
              : debtor.name
            : "";

          return {
            ...caseItem,
            creditor_name: creditorName,
            debtor_name: debtorName,
          };
        });

      setReceiverCases(filteredCases || []);
    } catch (error) {
      console.error("담당자 사건 목록 불러오기 오류:", error);
      setReceiverCases([]);
    }
  };

  // 사건 데이터 포맷팅 함수 (목록용)
  const formatCaseInfo = (caseItem) => {
    return `채권자: ${caseItem.creditor_name || "정보 없음"} / 채무자: ${
      caseItem.debtor_name || "정보 없음"
    }`;
  };

  // 사건 및 당사자 정보 포맷팅 함수 (선택 항목용)
  const formatCaseWithParties = (caseItem) => {
    const caseInfo = formatCaseInfo(caseItem);
    const partiesInfo = `(채권자: ${caseItem.creditor_name || "정보 없음"} / 채무자: ${
      caseItem.debtor_name || "정보 없음"
    })`;
    return `${caseInfo} ${partiesInfo}`;
  };

  // 초기 데이터 로딩
  useEffect(() => {
    if (user) {
      fetchOpinions();
      fetchReceivers();
      fetchCases();
    }
  }, [user]);

  // 읽음 상태 업데이트
  const updateReadStatus = async (opinionId) => {
    try {
      const { error } = await supabase
        .from("test_case_opinions")
        .update({ is_read: true })
        .eq("id", opinionId)
        .eq("receiver_id", user.id);

      if (error) throw error;

      // 읽음 상태 변경 후 UI 업데이트
      setOpinions((prev) =>
        prev.map((op) => (op.id === opinionId ? { ...op, is_read: true } : op))
      );
    } catch (error) {
      console.error("읽음 상태 업데이트 오류:", error);
    }
  };

  // 읽음/안읽음 상태 토글
  const toggleReadStatus = async (opinionId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("test_case_opinions")
        .update({ is_read: !currentStatus })
        .eq("id", opinionId)
        .eq("receiver_id", user.id);

      if (error) throw error;

      // UI 업데이트
      setOpinions((prev) =>
        prev.map((op) => (op.id === opinionId ? { ...op, is_read: !currentStatus } : op))
      );

      // 선택된 의견인 경우 선택된 의견도 업데이트
      if (selectedOpinion?.id === opinionId) {
        setSelectedOpinion((prev) => ({ ...prev, is_read: !currentStatus }));
      }

      toast.success(!currentStatus ? "읽음으로 표시되었습니다." : "안읽음으로 표시되었습니다.");
    } catch (error) {
      console.error("읽음 상태 변경 오류:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  // 의견 선택 핸들러
  const handleSelectOpinion = async (opinion) => {
    setSelectedOpinion(opinion);
    setSelectedOpinions([]);

    // 받은 메시지인 경우 읽음 상태 업데이트
    if (opinion.receiver_id === user.id && !opinion.is_read) {
      await updateReadStatus(opinion.id);
      // UI 업데이트
      setOpinions((prev) =>
        prev.map((op) => (op.id === opinion.id ? { ...op, is_read: true } : op))
      );
    }

    // 스크롤을 최상단으로 이동
    if (messageEndRef.current) {
      messageEndRef.current.scrollTop = messageEndRef.current.scrollHeight;
    }
  };

  // 메시지 시간 포맷
  const formatMessageTime = (date) => {
    return format(new Date(date), "yyyy.MM.dd HH:mm", { locale: ko });
  };

  // 상대적 시간 포맷 (예: '3시간 전')
  const formatRelativeTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
  };

  // 필터링된 의견 목록
  const filteredOpinions = opinions
    .filter((opinion) => {
      // 탭 필터링
      const tabFilter =
        currentTab === "received"
          ? opinion.receiver_id === user.id
          : opinion.created_by === user.id;

      // 검색어 필터링
      const searchFilter = searchQuery
        ? opinion.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opinion.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opinion.creditor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opinion.debtor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opinion.created_by_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opinion.receiver?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return tabFilter && searchFilter;
    })
    .sort((a, b) => {
      // 정렬
      if (sortOrder === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortOrder === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortOrder === "unread") {
        if (a.is_read === b.is_read) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return a.is_read ? 1 : -1;
      }
      return 0;
    });

  // 선택된 의견 토글
  const toggleSelectOpinion = (opinion) => {
    setSelectedOpinions((prev) => {
      if (prev.some((op) => op.id === opinion.id)) {
        return prev.filter((op) => op.id !== opinion.id);
      } else {
        return [...prev, opinion];
      }
    });
  };

  // 모든 의견 선택/해제
  const toggleSelectAll = () => {
    if (selectedOpinions.length === filteredOpinions.length) {
      setSelectedOpinions([]);
    } else {
      setSelectedOpinions([...filteredOpinions]);
    }
  };

  // 의견 삭제 핸들러
  const handleDeleteOpinions = async () => {
    if (selectedOpinions.length === 0) return;

    try {
      // 내가 받은 메시지는 receiver_deleted 플래그를,
      // 내가 보낸 메시지는 sender_deleted 플래그를 설정
      for (const opinion of selectedOpinions) {
        const updateData =
          opinion.receiver_id === user.id ? { receiver_deleted: true } : { sender_deleted: true };

        await supabase.from("test_case_opinions").update(updateData).eq("id", opinion.id);
      }

      toast.success(`${selectedOpinions.length}개의 쪽지가 삭제되었습니다.`);

      // 목록 새로고침 및 선택 초기화
      fetchOpinions();
      setSelectedOpinions([]);
      setShowDeleteConfirm(false);

      // 선택된 의견이 삭제된 경우 선택 해제
      if (selectedOpinion && selectedOpinions.some((op) => op.id === selectedOpinion.id)) {
        setSelectedOpinion(null);
      }
    } catch (error) {
      console.error("의견 삭제 오류:", error);
      toast.error("삭제에 실패했습니다.");
    }
  };

  // 답장 보내기 핸들러
  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedOpinion) {
      toast.error("메시지를 입력해주세요.");
      return;
    }

    try {
      setSendingReply(true);

      // 원본 제목에서 "Re: " 부분을 제거하고 새 제목 생성
      const originalTitle = selectedOpinion.title.replace(/^(Re: )+/, "");
      const newTitle = `Re: ${originalTitle}`;

      // 인용 메시지 없이 그냥 답장 내용만 전송
      const { data, error } = await supabase
        .from("test_case_opinions")
        .insert({
          case_id: selectedOpinion.case_id,
          parent_id: selectedOpinion.id,
          created_by: user.id,
          receiver_id: selectedOpinion.created_by,
          title: newTitle,
          message: replyMessage.trim(), // 인용 없이 메시지만 전송
          creditor_name: selectedOpinion.creditor_name,
          debtor_name: selectedOpinion.debtor_name,
          depth: (selectedOpinion.depth || 0) + 1,
        })
        .select();

      if (error) throw error;

      toast.success("답장을 보냈습니다.");
      setReplyMessage("");
      await fetchOpinions();

      // 방금 보낸 메시지 선택
      if (data && data.length > 0) {
        const sentOpinion = data[0];
        // 보낸 쪽지함으로 전환하고 방금 보낸 쪽지 선택
        setCurrentTab("sent");

        // 데이터에 created_by_user와 receiver 정보를 추가
        const enrichedSentOpinion = {
          ...sentOpinion,
          created_by_user: { id: user.id, name: user.name, email: user.email },
          receiver: selectedOpinion.created_by_user,
        };

        setSelectedOpinion(enrichedSentOpinion);
      }
    } catch (error) {
      console.error("답장 보내기 오류:", error);
      toast.error("답장 보내기에 실패했습니다.");
    } finally {
      setSendingReply(false);
    }
  };

  // 새 쪽지 보내기 핸들러
  const handleSendNewMessage = async () => {
    if (!newMessage.title.trim() || !newMessage.message.trim() || !newMessage.receiver_id) {
      toast.error("제목, 내용, 수신자를 모두 입력해주세요.");
      return;
    }

    try {
      setSendingReply(true);

      const { data, error } = await supabase
        .from("test_case_opinions")
        .insert({
          case_id: newMessage.case_id !== "none" ? newMessage.case_id : null,
          created_by: user.id,
          receiver_id: newMessage.receiver_id,
          title: newMessage.title.trim(),
          message: newMessage.message.trim(),
          creditor_name: newMessage.creditor_name || "",
          debtor_name: newMessage.debtor_name || "",
          depth: 0,
        })
        .select();

      if (error) throw error;

      toast.success("쪽지를 보냈습니다.");
      setShowComposeDialog(false);
      setNewMessage({
        title: "",
        message: "",
        receiver_id: "",
        creditor_name: "",
        debtor_name: "",
        case_id: "",
      });

      await fetchOpinions();

      // 방금 보낸 메시지 선택
      if (data && data.length > 0) {
        const sentOpinion = data[0];
        // 보낸 쪽지함으로 전환하고 방금 보낸 쪽지 선택
        setCurrentTab("sent");

        // 데이터에 created_by_user와 receiver 정보를 추가
        const selectedReceiver = receivers.find((r) => r.id === newMessage.receiver_id);
        const enrichedSentOpinion = {
          ...sentOpinion,
          created_by_user: { id: user.id, name: user.name, email: user.email },
          receiver: selectedReceiver,
        };

        setSelectedOpinion(enrichedSentOpinion);
      }
    } catch (error) {
      console.error("쪽지 보내기 오류:", error);
      toast.error("쪽지 보내기에 실패했습니다.");
    } finally {
      setSendingReply(false);
    }
  };

  // 담당자 선택 핸들러
  const handleSelectReceiver = (receiverId) => {
    setNewMessage((prev) => ({
      ...prev,
      receiver_id: receiverId,
      case_id: "", // 담당자 변경 시 사건 초기화
      creditor_name: "",
      debtor_name: "",
    }));

    // 담당자가 담당하는 사건 목록 불러오기
    fetchHandlerCases(receiverId);
  };

  // 사건 선택 핸들러
  const handleSelectCase = (caseId) => {
    if (caseId === "none") {
      setNewMessage((prev) => ({
        ...prev,
        case_id: null,
        creditor_name: "",
        debtor_name: "",
      }));
      return;
    }

    // 담당자의 사건 목록과 전체 사건 목록 모두 확인
    const selectedCase = [...receiverCases, ...cases].find((c) => c.id === caseId);

    if (selectedCase) {
      setNewMessage((prev) => ({
        ...prev,
        case_id: caseId,
        creditor_name: selectedCase.creditor_name || "",
        debtor_name: selectedCase.debtor_name || "",
      }));
    }
  };

  // 선택된 사건 정보를 가져오는 함수
  const getSelectedCaseInfo = () => {
    if (!newMessage.case_id || newMessage.case_id === "none") return null;

    // 담당자의 사건 목록과 전체 사건 목록에서 선택된 사건 찾기
    const selectedCase = [...receiverCases, ...cases].find((c) => c.id === newMessage.case_id);
    if (!selectedCase) return null;

    return formatCaseWithParties(selectedCase);
  };

  // 다이얼로그 열기 핸들러
  const handleOpenComposeDialog = () => {
    // 다이얼로그를 열 때 초기화
    setNewMessage({
      title: "",
      message: "",
      receiver_id: "",
      creditor_name: "",
      debtor_name: "",
      case_id: "",
    });
    setReceiverCases([]);
    setShowComposeDialog(true);
  };

  // Scroll 자동 이동을 위한 useEffect 추가
  useEffect(() => {
    // 메시지 선택 시 스크롤 위치 조정 - setTimeout을 길게 설정
    setTimeout(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollTop = messageEndRef.current.scrollHeight;
      }
    }, 200);
  }, [selectedOpinion, opinions]);

  // 메시지 입력 영역에서 Enter 키로 보내기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (replyInputRef.current && replyInputRef.current === document.activeElement) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (replyMessage.trim() && !sendingReply) {
            handleSendReply();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [replyMessage, sendingReply]);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>의견 관리</CardTitle>
            <CardDescription>담당자들과 의견을 주고받을 수 있습니다.</CardDescription>
          </div>
          <Button onClick={handleOpenComposeDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />새 대화 시작
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* 대화방 목록 */}
        <ConversationList
          opinions={opinions}
          loading={loading}
          refreshing={refreshing}
          fetchOpinions={fetchOpinions}
          selectedOpinion={selectedOpinion}
          handleSelectOpinion={handleSelectOpinion}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          user={user}
        />

        {/* 채팅 영역 - 라이브러리 적용 */}
        <ChatView
          selectedOpinion={selectedOpinion}
          opinions={opinions}
          user={user}
          replyMessage={replyMessage}
          setReplyMessage={setReplyMessage}
          sendingReply={sendingReply}
          handleSendReply={handleSendReply}
          setSelectedOpinions={setSelectedOpinions}
          setShowDeleteConfirm={setShowDeleteConfirm}
          messageEndRef={messageEndRef}
          replyInputRef={replyInputRef}
        />
      </div>

      {/* 새 쪽지 작성 다이얼로그 */}
      <ComposeDialog
        showComposeDialog={showComposeDialog}
        setShowComposeDialog={setShowComposeDialog}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        receivers={receivers}
        receiverCases={receiverCases}
        handleSelectReceiver={handleSelectReceiver}
        handleSelectCase={handleSelectCase}
        handleSendNewMessage={handleSendNewMessage}
        sendingReply={sendingReply}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        selectedOpinions={selectedOpinions}
        handleDeleteOpinions={handleDeleteOpinions}
      />
    </div>
  );
}
