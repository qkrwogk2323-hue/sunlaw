export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      billing_entries: {
        Row: {
          amount: number
          bill_to_case_client_id: string | null
          bill_to_case_organization_id: string | null
          bill_to_party_kind:
            | Database["public"]["Enums"]["billing_party_kind"]
            | null
          billing_owner_case_organization_id: string | null
          case_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_on: string | null
          entry_kind: Database["public"]["Enums"]["billing_entry_kind"]
          fee_agreement_id: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          source_event_id: string | null
          source_event_type: string | null
          status: Database["public"]["Enums"]["billing_status"]
          tax_amount: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind?:
            | Database["public"]["Enums"]["billing_party_kind"]
            | null
          billing_owner_case_organization_id?: string | null
          case_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          entry_kind: Database["public"]["Enums"]["billing_entry_kind"]
          fee_agreement_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          source_event_id?: string | null
          source_event_type?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          tax_amount?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind?:
            | Database["public"]["Enums"]["billing_party_kind"]
            | null
          billing_owner_case_organization_id?: string | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          entry_kind?: Database["public"]["Enums"]["billing_entry_kind"]
          fee_agreement_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          source_event_id?: string | null
          source_event_type?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          tax_amount?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_entries_bill_to_client_fk"
            columns: ["bill_to_case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_bill_to_org_fk"
            columns: ["bill_to_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_billing_owner_fk"
            columns: ["billing_owner_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_fee_agreement_fk"
            columns: ["fee_agreement_id"]
            isOneToOne: false
            referencedRelation: "fee_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscription_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_reason: string | null
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          state: Database["public"]["Enums"]["subscription_state"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_reason?: string | null
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          state: Database["public"]["Enums"]["subscription_state"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_reason?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          state?: Database["public"]["Enums"]["subscription_state"]
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscription_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_clients: {
        Row: {
          case_id: string
          client_email_snapshot: string | null
          client_name: string
          created_at: string
          created_by: string | null
          detached_at: string | null
          id: string
          is_portal_enabled: boolean
          last_linked_hub_id: string | null
          link_status: Database["public"]["Enums"]["case_client_link_status"]
          organization_id: string
          orphan_reason:
            | Database["public"]["Enums"]["case_client_orphan_reason"]
            | null
          orphaned_at: string | null
          profile_id: string | null
          relation_label: string | null
          relink_policy: Database["public"]["Enums"]["case_client_relink_policy"]
          review_deadline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id: string
          client_email_snapshot?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          detached_at?: string | null
          id?: string
          is_portal_enabled?: boolean
          last_linked_hub_id?: string | null
          link_status?: Database["public"]["Enums"]["case_client_link_status"]
          organization_id: string
          orphan_reason?:
            | Database["public"]["Enums"]["case_client_orphan_reason"]
            | null
          orphaned_at?: string | null
          profile_id?: string | null
          relation_label?: string | null
          relink_policy?: Database["public"]["Enums"]["case_client_relink_policy"]
          review_deadline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          client_email_snapshot?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          detached_at?: string | null
          id?: string
          is_portal_enabled?: boolean
          last_linked_hub_id?: string | null
          link_status?: Database["public"]["Enums"]["case_client_link_status"]
          organization_id?: string
          orphan_reason?:
            | Database["public"]["Enums"]["case_client_orphan_reason"]
            | null
          orphaned_at?: string | null
          profile_id?: string | null
          relation_label?: string | null
          relink_policy?: Database["public"]["Enums"]["case_client_relink_policy"]
          review_deadline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_clients_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_last_linked_hub_id_fkey"
            columns: ["last_linked_hub_id"]
            isOneToOne: false
            referencedRelation: "case_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_document_reviews: {
        Row: {
          case_document_id: string
          case_id: string
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          id: string
          organization_id: string
          request_status: Database["public"]["Enums"]["approval_status"]
          requested_by: string | null
          requested_by_name: string | null
          snapshot_version: number
        }
        Insert: {
          case_document_id: string
          case_id: string
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          id?: string
          organization_id: string
          request_status: Database["public"]["Enums"]["approval_status"]
          requested_by?: string | null
          requested_by_name?: string | null
          snapshot_version?: number
        }
        Update: {
          case_document_id?: string
          case_id?: string
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          id?: string
          organization_id?: string
          request_status?: Database["public"]["Enums"]["approval_status"]
          requested_by?: string | null
          requested_by_name?: string | null
          snapshot_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_document_reviews_case_document_id_fkey"
            columns: ["case_document_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_document_reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_document_reviews_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_document_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_document_reviews_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          approval_requested_at: string | null
          approval_requested_by: string | null
          approval_requested_by_name: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          case_id: string
          client_visibility: Database["public"]["Enums"]["client_visibility"]
          content_markdown: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          document_kind: Database["public"]["Enums"]["document_kind"]
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          row_version: number
          source_data_snapshot: Json | null
          source_document_type: string | null
          source_kind: string | null
          storage_path: string | null
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_requested_by_name?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          case_id: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          document_kind: Database["public"]["Enums"]["document_kind"]
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          row_version?: number
          source_data_snapshot?: Json | null
          source_document_type?: string | null
          source_kind?: string | null
          storage_path?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_requested_by_name?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          case_id?: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          document_kind?: Database["public"]["Enums"]["document_kind"]
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          row_version?: number
          source_data_snapshot?: Json | null
          source_document_type?: string | null
          source_kind?: string | null
          storage_path?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_approval_requested_by_fkey"
            columns: ["approval_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_handlers: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          handler_name: string
          id: string
          organization_id: string
          profile_id: string | null
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          handler_name: string
          id?: string
          organization_id: string
          profile_id?: string | null
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          handler_name?: string
          id?: string
          organization_id?: string
          profile_id?: string | null
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_handlers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_handlers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_handlers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_handlers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_handlers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_hub_activity: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          hub_id: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          hub_id: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          hub_id?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_hub_activity_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_activity_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "case_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      case_hub_members: {
        Row: {
          access_level: string
          hub_id: string
          id: string
          is_ready: boolean
          joined_at: string
          last_read_at: string | null
          last_seen_at: string | null
          membership_role: string
          profile_id: string
          seat_kind: string
        }
        Insert: {
          access_level?: string
          hub_id: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_read_at?: string | null
          last_seen_at?: string | null
          membership_role?: string
          profile_id: string
          seat_kind?: string
        }
        Update: {
          access_level?: string
          hub_id?: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_read_at?: string | null
          last_seen_at?: string | null
          membership_role?: string
          profile_id?: string
          seat_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_hub_members_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "case_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_hub_organizations: {
        Row: {
          access_scope: Database["public"]["Enums"]["case_access_scope"]
          created_at: string
          created_by: string | null
          hub_id: string
          hub_role: Database["public"]["Enums"]["case_organization_role"]
          id: string
          linked_at: string
          organization_id: string
          source_case_organization_id: string | null
          status: Database["public"]["Enums"]["case_hub_organization_status"]
          unlinked_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["case_access_scope"]
          created_at?: string
          created_by?: string | null
          hub_id: string
          hub_role: Database["public"]["Enums"]["case_organization_role"]
          id?: string
          linked_at?: string
          organization_id: string
          source_case_organization_id?: string | null
          status?: Database["public"]["Enums"]["case_hub_organization_status"]
          unlinked_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["case_access_scope"]
          created_at?: string
          created_by?: string | null
          hub_id?: string
          hub_role?: Database["public"]["Enums"]["case_organization_role"]
          id?: string
          linked_at?: string
          organization_id?: string
          source_case_organization_id?: string | null
          status?: Database["public"]["Enums"]["case_hub_organization_status"]
          unlinked_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_hub_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_organizations_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "case_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_organizations_source_case_organization_id_fkey"
            columns: ["source_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hub_organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_hubs: {
        Row: {
          case_id: string
          collaborator_limit: number
          created_at: string
          created_by: string | null
          id: string
          lifecycle_status: string
          organization_id: string
          primary_case_client_id: string | null
          primary_client_id: string | null
          status: string
          title: string | null
          updated_at: string
          viewer_limit: number
          visibility_scope: string
        }
        Insert: {
          case_id: string
          collaborator_limit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lifecycle_status?: string
          organization_id: string
          primary_case_client_id?: string | null
          primary_client_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          viewer_limit?: number
          visibility_scope?: string
        }
        Update: {
          case_id?: string
          collaborator_limit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lifecycle_status?: string
          organization_id?: string
          primary_case_client_id?: string | null
          primary_client_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          viewer_limit?: number
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_hubs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hubs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hubs_primary_case_client_id_fkey"
            columns: ["primary_case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hubs_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          body: string
          case_id: string
          created_at: string
          id: string
          is_internal: boolean
          organization_id: string
          sender_profile_id: string
          sender_role: string
          updated_at: string
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          organization_id: string
          sender_profile_id: string
          sender_role: string
          updated_at?: string
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          organization_id?: string
          sender_profile_id?: string
          sender_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_module_catalog: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          is_system: boolean
          module_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          is_system?: boolean
          module_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          is_system?: boolean
          module_key?: string
        }
        Relationships: []
      }
      case_organizations: {
        Row: {
          access_scope: Database["public"]["Enums"]["case_access_scope"]
          agreement_summary: string | null
          billing_scope: Database["public"]["Enums"]["case_billing_scope"]
          can_manage_collection: boolean
          can_receive_legal_requests: boolean
          can_submit_legal_requests: boolean
          can_view_client_messages: boolean
          case_id: string
          communication_scope: Database["public"]["Enums"]["case_communication_scope"]
          created_at: string
          created_by: string | null
          ended_on: string | null
          id: string
          instructed_by_case_organization_id: string | null
          is_lead: boolean
          organization_id: string
          role: Database["public"]["Enums"]["case_organization_role"]
          started_on: string | null
          status: Database["public"]["Enums"]["case_organization_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["case_access_scope"]
          agreement_summary?: string | null
          billing_scope?: Database["public"]["Enums"]["case_billing_scope"]
          can_manage_collection?: boolean
          can_receive_legal_requests?: boolean
          can_submit_legal_requests?: boolean
          can_view_client_messages?: boolean
          case_id: string
          communication_scope?: Database["public"]["Enums"]["case_communication_scope"]
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          id?: string
          instructed_by_case_organization_id?: string | null
          is_lead?: boolean
          organization_id: string
          role: Database["public"]["Enums"]["case_organization_role"]
          started_on?: string | null
          status?: Database["public"]["Enums"]["case_organization_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["case_access_scope"]
          agreement_summary?: string | null
          billing_scope?: Database["public"]["Enums"]["case_billing_scope"]
          can_manage_collection?: boolean
          can_receive_legal_requests?: boolean
          can_submit_legal_requests?: boolean
          can_view_client_messages?: boolean
          case_id?: string
          communication_scope?: Database["public"]["Enums"]["case_communication_scope"]
          created_at?: string
          created_by?: string | null
          ended_on?: string | null
          id?: string
          instructed_by_case_organization_id?: string | null
          is_lead?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["case_organization_role"]
          started_on?: string | null
          status?: Database["public"]["Enums"]["case_organization_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_organizations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_organizations_instructed_by_case_organization_id_fkey"
            columns: ["instructed_by_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          address_summary: string | null
          case_id: string
          company_name: string | null
          created_at: string
          created_by: string | null
          display_name: string
          email: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_primary: boolean
          notes: string | null
          organization_id: string
          party_role: Database["public"]["Enums"]["party_role"]
          phone: string | null
          registration_number_masked: string | null
          resident_number_last4: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_summary?: string | null
          case_id: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          email?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id: string
          party_role: Database["public"]["Enums"]["party_role"]
          phone?: string | null
          registration_number_masked?: string | null
          resident_number_last4?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_summary?: string | null
          case_id?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id?: string
          party_role?: Database["public"]["Enums"]["party_role"]
          phone?: string | null
          registration_number_masked?: string | null
          resident_number_last4?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_party_private_profiles: {
        Row: {
          address_detail_ciphertext: string | null
          case_id: string
          case_party_id: string
          created_at: string
          created_by: string | null
          id: string
          key_version: number
          organization_id: string
          registration_number_ciphertext: string | null
          resident_number_ciphertext: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_detail_ciphertext?: string | null
          case_id: string
          case_party_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_version?: number
          organization_id: string
          registration_number_ciphertext?: string | null
          resident_number_ciphertext?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_detail_ciphertext?: string | null
          case_id?: string
          case_party_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_version?: number
          organization_id?: string
          registration_number_ciphertext?: string | null
          resident_number_ciphertext?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_party_private_profiles_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_party_private_profiles_case_party_id_fkey"
            columns: ["case_party_id"]
            isOneToOne: true
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_party_private_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_party_private_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_party_private_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_recovery_activities: {
        Row: {
          activity_kind: Database["public"]["Enums"]["recovery_activity_kind"]
          amount: number
          case_id: string
          client_visibility: Database["public"]["Enums"]["client_visibility"]
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          notes: string | null
          occurred_at: string
          organization_id: string
          outcome_status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_kind: Database["public"]["Enums"]["recovery_activity_kind"]
          amount?: number
          case_id: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          notes?: string | null
          occurred_at: string
          organization_id: string
          outcome_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_kind?: Database["public"]["Enums"]["recovery_activity_kind"]
          amount?: number
          case_id?: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          outcome_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_recovery_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_recovery_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_recovery_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_recovery_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_request_attachments: {
        Row: {
          case_id: string
          case_request_id: string
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          storage_path: string
        }
        Insert: {
          case_id: string
          case_request_id: string
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          storage_path: string
        }
        Update: {
          case_id?: string
          case_request_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_request_attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_request_attachments_case_request_id_fkey"
            columns: ["case_request_id"]
            isOneToOne: false
            referencedRelation: "case_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_request_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_request_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_requests: {
        Row: {
          assigned_to: string | null
          body: string
          case_id: string
          client_visible: boolean
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          organization_id: string
          request_kind: Database["public"]["Enums"]["case_request_kind"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["case_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body: string
          case_id: string
          client_visible?: boolean
          created_at?: string
          created_by: string
          due_at?: string | null
          id?: string
          organization_id: string
          request_kind: Database["public"]["Enums"]["case_request_kind"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["case_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string
          case_id?: string
          client_visible?: boolean
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          organization_id?: string
          request_kind?: Database["public"]["Enums"]["case_request_kind"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["case_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_schedules: {
        Row: {
          case_id: string
          client_visibility: Database["public"]["Enums"]["client_visibility"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          is_important: boolean
          location: string | null
          notes: string | null
          organization_id: string
          schedule_kind: Database["public"]["Enums"]["schedule_kind"]
          scheduled_end: string | null
          scheduled_start: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_important?: boolean
          location?: string | null
          notes?: string | null
          organization_id: string
          schedule_kind: Database["public"]["Enums"]["schedule_kind"]
          scheduled_end?: string | null
          scheduled_start: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          client_visibility?: Database["public"]["Enums"]["client_visibility"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_important?: boolean
          location?: string | null
          notes?: string | null
          organization_id?: string
          schedule_kind?: Database["public"]["Enums"]["schedule_kind"]
          scheduled_end?: string | null
          scheduled_start?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_schedules_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_stage_template_steps: {
        Row: {
          created_at: string
          display_name: string
          id: string
          sequence_no: number
          step_key: string
          template_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          sequence_no: number
          step_key: string
          template_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          sequence_no?: number
          step_key?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_stage_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "case_stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      case_stage_templates: {
        Row: {
          case_type: Database["public"]["Enums"]["case_type"] | null
          created_at: string
          display_name: string
          id: string
          is_system: boolean
          organization_id: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          case_type?: Database["public"]["Enums"]["case_type"] | null
          created_at?: string
          display_name: string
          id?: string
          is_system?: boolean
          organization_id?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          case_type?: Database["public"]["Enums"]["case_type"] | null
          created_at?: string
          display_name?: string
          id?: string
          is_system?: boolean
          organization_id?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_stage_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_type_default_modules: {
        Row: {
          case_type: Database["public"]["Enums"]["case_type"]
          id: string
          module_key: string
        }
        Insert: {
          case_type: Database["public"]["Enums"]["case_type"]
          id?: string
          module_key: string
        }
        Update: {
          case_type?: Database["public"]["Enums"]["case_type"]
          id?: string
          module_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_type_default_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "case_module_catalog"
            referencedColumns: ["module_key"]
          },
        ]
      }
      cases: {
        Row: {
          appeal_assigned_judge: string | null
          appeal_case_number: string | null
          appeal_court_name: string | null
          appeal_court_room: string | null
          appeal_division: string | null
          appeal_presiding_judge: string | null
          assigned_judge: string | null
          case_number: string | null
          case_status: Database["public"]["Enums"]["case_status"]
          case_type: Database["public"]["Enums"]["case_type"]
          client_contact_address: string | null
          client_contact_fax: string | null
          client_contact_phone: string | null
          closed_on: string | null
          colaw_case_basic_seq: string | null
          court_division: string | null
          court_name: string | null
          court_room: string | null
          cover_notes: string | null
          created_at: string
          created_by: string | null
          deadline_appeal: string | null
          deadline_filing: string | null
          deadline_final_appeal: string | null
          deleted_at: string | null
          id: string
          insolvency_subtype:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          interest_rate: number | null
          legal_hold_until: string | null
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          module_flags: Json
          opened_on: string | null
          opponent_counsel_fax: string | null
          opponent_counsel_name: string | null
          opponent_counsel_phone: string | null
          organization_id: string
          presiding_judge: string | null
          principal_amount: number
          reference_no: string | null
          retention_class: Database["public"]["Enums"]["retention_class"]
          row_version: number
          stage_key: string | null
          stage_template_key: string | null
          summary: string | null
          supreme_assigned_judge: string | null
          supreme_case_number: string | null
          supreme_division: string | null
          supreme_presiding_judge: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appeal_assigned_judge?: string | null
          appeal_case_number?: string | null
          appeal_court_name?: string | null
          appeal_court_room?: string | null
          appeal_division?: string | null
          appeal_presiding_judge?: string | null
          assigned_judge?: string | null
          case_number?: string | null
          case_status?: Database["public"]["Enums"]["case_status"]
          case_type: Database["public"]["Enums"]["case_type"]
          client_contact_address?: string | null
          client_contact_fax?: string | null
          client_contact_phone?: string | null
          closed_on?: string | null
          colaw_case_basic_seq?: string | null
          court_division?: string | null
          court_name?: string | null
          court_room?: string | null
          cover_notes?: string | null
          created_at?: string
          created_by?: string | null
          deadline_appeal?: string | null
          deadline_filing?: string | null
          deadline_final_appeal?: string | null
          deleted_at?: string | null
          id?: string
          insolvency_subtype?:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          interest_rate?: number | null
          legal_hold_until?: string | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          module_flags?: Json
          opened_on?: string | null
          opponent_counsel_fax?: string | null
          opponent_counsel_name?: string | null
          opponent_counsel_phone?: string | null
          organization_id: string
          presiding_judge?: string | null
          principal_amount?: number
          reference_no?: string | null
          retention_class?: Database["public"]["Enums"]["retention_class"]
          row_version?: number
          stage_key?: string | null
          stage_template_key?: string | null
          summary?: string | null
          supreme_assigned_judge?: string | null
          supreme_case_number?: string | null
          supreme_division?: string | null
          supreme_presiding_judge?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appeal_assigned_judge?: string | null
          appeal_case_number?: string | null
          appeal_court_name?: string | null
          appeal_court_room?: string | null
          appeal_division?: string | null
          appeal_presiding_judge?: string | null
          assigned_judge?: string | null
          case_number?: string | null
          case_status?: Database["public"]["Enums"]["case_status"]
          case_type?: Database["public"]["Enums"]["case_type"]
          client_contact_address?: string | null
          client_contact_fax?: string | null
          client_contact_phone?: string | null
          closed_on?: string | null
          colaw_case_basic_seq?: string | null
          court_division?: string | null
          court_name?: string | null
          court_room?: string | null
          cover_notes?: string | null
          created_at?: string
          created_by?: string | null
          deadline_appeal?: string | null
          deadline_filing?: string | null
          deadline_final_appeal?: string | null
          deleted_at?: string | null
          id?: string
          insolvency_subtype?:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          interest_rate?: number | null
          legal_hold_until?: string | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          module_flags?: Json
          opened_on?: string | null
          opponent_counsel_fax?: string | null
          opponent_counsel_name?: string | null
          opponent_counsel_phone?: string | null
          organization_id?: string
          presiding_judge?: string | null
          principal_amount?: number
          reference_no?: string | null
          retention_class?: Database["public"]["Enums"]["retention_class"]
          row_version?: number
          stage_key?: string | null
          stage_template_key?: string | null
          summary?: string | null
          supreme_assigned_judge?: string | null
          supreme_case_number?: string | null
          supreme_division?: string | null
          supreme_presiding_judge?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_access_requests: {
        Row: {
          created_at: string
          id: string
          request_note: string | null
          requester_email: string
          requester_name: string
          requester_profile_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["client_access_request_status"]
          target_organization_id: string
          target_organization_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_note?: string | null
          requester_email: string
          requester_name: string
          requester_profile_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["client_access_request_status"]
          target_organization_id: string
          target_organization_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          request_note?: string | null
          requester_email?: string
          requester_name?: string
          requester_profile_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["client_access_request_status"]
          target_organization_id?: string
          target_organization_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_requests_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_private_profiles: {
        Row: {
          address_line1_ciphertext: string | null
          address_line2_ciphertext: string | null
          created_at: string
          created_by: string | null
          key_version: number
          legal_name: string
          mobile_phone_ciphertext: string | null
          postal_code_ciphertext: string | null
          profile_id: string
          resident_number_ciphertext: string
          resident_number_masked: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_line1_ciphertext?: string | null
          address_line2_ciphertext?: string | null
          created_at?: string
          created_by?: string | null
          key_version?: number
          legal_name: string
          mobile_phone_ciphertext?: string | null
          postal_code_ciphertext?: string | null
          profile_id: string
          resident_number_ciphertext: string
          resident_number_masked: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_line1_ciphertext?: string | null
          address_line2_ciphertext?: string | null
          created_at?: string
          created_by?: string | null
          key_version?: number
          legal_name?: string
          mobile_phone_ciphertext?: string | null
          postal_code_ciphertext?: string | null
          profile_id?: string
          resident_number_ciphertext?: string
          resident_number_masked?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_private_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_private_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_private_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_requests: {
        Row: {
          account_status_snapshot: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          profile_id: string
          request_kind: string
          resolved_at: string | null
          resolved_note: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_status_snapshot: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          profile_id: string
          request_kind?: string
          resolved_at?: string | null
          resolved_note?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_status_snapshot?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          profile_id?: string
          request_kind?: string
          resolved_at?: string | null
          resolved_note?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_service_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_temp_credentials: {
        Row: {
          case_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          issued_by: string | null
          last_password_changed_at: string | null
          login_email: string
          login_id: string
          login_id_normalized: string
          must_change_password: boolean
          organization_id: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          issued_by?: string | null
          last_password_changed_at?: string | null
          login_email: string
          login_id: string
          login_id_normalized: string
          must_change_password?: boolean
          organization_id?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          issued_by?: string | null
          last_password_changed_at?: string | null
          login_email?: string
          login_id?: string
          login_id_normalized?: string
          must_change_password?: boolean
          organization_id?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_temp_credentials_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_temp_credentials_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_temp_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_temp_credentials_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_compensation_entries: {
        Row: {
          calculated_amount: number
          calculated_from_amount: number
          case_id: string
          collection_compensation_plan_version_id: string
          created_at: string
          id: string
          note: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["compensation_entry_status"]
          updated_at: string
        }
        Insert: {
          calculated_amount?: number
          calculated_from_amount?: number
          case_id: string
          collection_compensation_plan_version_id: string
          created_at?: string
          id?: string
          note?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["compensation_entry_status"]
          updated_at?: string
        }
        Update: {
          calculated_amount?: number
          calculated_from_amount?: number
          case_id?: string
          collection_compensation_plan_version_id?: string
          created_at?: string
          id?: string
          note?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["compensation_entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_compensation_entri_collection_compensation_plan_fkey"
            columns: ["collection_compensation_plan_version_id"]
            isOneToOne: false
            referencedRelation: "collection_compensation_plan_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_compensation_plan_versions: {
        Row: {
          base_metric: string | null
          collection_compensation_plan_id: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          fixed_amount: number | null
          fixed_at: string | null
          fixed_by: string | null
          id: string
          rate: number | null
          rule_json: Json
          status: Database["public"]["Enums"]["compensation_plan_status"]
        }
        Insert: {
          base_metric?: string | null
          collection_compensation_plan_id: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          fixed_amount?: number | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          rate?: number | null
          rule_json?: Json
          status?: Database["public"]["Enums"]["compensation_plan_status"]
        }
        Update: {
          base_metric?: string | null
          collection_compensation_plan_id?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          fixed_amount?: number | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          rate?: number | null
          rule_json?: Json
          status?: Database["public"]["Enums"]["compensation_plan_status"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_compensation_plan__collection_compensation_plan_fkey"
            columns: ["collection_compensation_plan_id"]
            isOneToOne: false
            referencedRelation: "collection_compensation_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plan_versions_fixed_by_fkey"
            columns: ["fixed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_compensation_plans: {
        Row: {
          beneficiary_case_organization_id: string | null
          beneficiary_membership_id: string | null
          case_id: string
          collection_org_case_organization_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          settlement_cycle: string
          target_kind: Database["public"]["Enums"]["compensation_target_kind"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficiary_case_organization_id?: string | null
          beneficiary_membership_id?: string | null
          case_id: string
          collection_org_case_organization_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          settlement_cycle?: string
          target_kind: Database["public"]["Enums"]["compensation_target_kind"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficiary_case_organization_id?: string | null
          beneficiary_membership_id?: string | null
          case_id?: string
          collection_org_case_organization_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          settlement_cycle?: string
          target_kind?: Database["public"]["Enums"]["compensation_target_kind"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_compensation_plans_beneficiary_case_organizatio_fkey"
            columns: ["beneficiary_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plans_beneficiary_membership_id_fkey"
            columns: ["beneficiary_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plans_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plans_collection_org_case_organiza_fkey"
            columns: ["collection_org_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_compensation_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_payouts: {
        Row: {
          collection_compensation_entry_id: string
          created_at: string
          created_by: string | null
          id: string
          payout_amount: number
          payout_date: string | null
          reference_text: string | null
        }
        Insert: {
          collection_compensation_entry_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          payout_amount?: number
          payout_date?: string | null
          reference_text?: string | null
        }
        Update: {
          collection_compensation_entry_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payout_amount?: number
          payout_date?: string | null
          reference_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_payouts_collection_compensation_entry_id_fkey"
            columns: ["collection_compensation_entry_id"]
            isOneToOne: false
            referencedRelation: "collection_compensation_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_performance_daily: {
        Row: {
          case_id: string
          collection_org_case_organization_id: string
          confirmed_compensation_amount: number
          created_at: string
          expected_compensation_amount: number
          id: string
          organization_membership_id: string | null
          performance_date: string
          recovered_amount: number
        }
        Insert: {
          case_id: string
          collection_org_case_organization_id: string
          confirmed_compensation_amount?: number
          created_at?: string
          expected_compensation_amount?: number
          id?: string
          organization_membership_id?: string | null
          performance_date: string
          recovered_amount?: number
        }
        Update: {
          case_id?: string
          collection_org_case_organization_id?: string
          confirmed_compensation_amount?: number
          created_at?: string
          expected_compensation_amount?: number
          id?: string
          organization_membership_id?: string | null
          performance_date?: string
          recovered_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_performance_daily_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_performance_daily_collection_org_case_organizat_fkey"
            columns: ["collection_org_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_performance_daily_organization_membership_id_fkey"
            columns: ["organization_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      content_resources: {
        Row: {
          id: string
          locale: string
          namespace: string
          organization_id: string | null
          published_at: string | null
          resource_key: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          value_json: Json | null
          value_text: string | null
        }
        Insert: {
          id?: string
          locale?: string
          namespace: string
          organization_id?: string | null
          published_at?: string | null
          resource_key: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_text?: string | null
        }
        Update: {
          id?: string
          locale?: string
          namespace?: string
          organization_id?: string | null
          published_at?: string | null
          resource_key?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resources_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ingestion_jobs: {
        Row: {
          ai_model: string | null
          ai_prompt_version: string | null
          case_document_id: string | null
          case_id: string
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["ingestion_document_type"]
          extracted_json: Json | null
          file_size_bytes: number | null
          id: string
          last_error: string | null
          max_retries: number
          mime_type: string
          organization_id: string
          original_filename: string
          processing_completed_at: string | null
          processing_started_at: string | null
          retry_count: number
          status: Database["public"]["Enums"]["ingestion_status"]
          storage_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          case_document_id?: string | null
          case_id: string
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["ingestion_document_type"]
          extracted_json?: Json | null
          file_size_bytes?: number | null
          id?: string
          last_error?: string | null
          max_retries?: number
          mime_type: string
          organization_id: string
          original_filename: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["ingestion_status"]
          storage_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          case_document_id?: string | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["ingestion_document_type"]
          extracted_json?: Json | null
          file_size_bytes?: number | null
          id?: string
          last_error?: string | null
          max_retries?: number
          mime_type?: string
          organization_id?: string
          original_filename?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["ingestion_status"]
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ingestion_jobs_case_document_id_fkey"
            columns: ["case_document_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestion_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestion_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestion_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestion_jobs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          conditions_json: Json
          enabled: boolean
          flag_key: string
          id: string
          organization_id: string | null
          rollout_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          conditions_json?: Json
          enabled?: boolean
          flag_key: string
          id?: string
          organization_id?: string | null
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          conditions_json?: Json
          enabled?: boolean
          flag_key?: string
          id?: string
          organization_id?: string | null
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_agreements: {
        Row: {
          agreement_type: Database["public"]["Enums"]["billing_agreement_type"]
          bill_to_case_client_id: string | null
          bill_to_case_organization_id: string | null
          bill_to_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id: string
          case_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          effective_from: string | null
          effective_to: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean
          rate: number | null
          terms_json: Json
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agreement_type: Database["public"]["Enums"]["billing_agreement_type"]
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id: string
          case_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          rate?: number | null
          terms_json?: Json
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agreement_type?: Database["public"]["Enums"]["billing_agreement_type"]
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind?: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          rate?: number | null
          terms_json?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_agreements_bill_to_case_client_id_fkey"
            columns: ["bill_to_case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_bill_to_case_organization_id_fkey"
            columns: ["bill_to_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_billing_owner_case_organization_id_fkey"
            columns: ["billing_owner_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_client_action_items: {
        Row: {
          ai_extracted: boolean
          case_id: string
          client_checked_at: string | null
          client_checked_by: string | null
          client_note: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_completed: boolean
          organization_id: string
          packet_id: string
          responsibility: Database["public"]["Enums"]["action_item_responsibility"]
          staff_note: string | null
          staff_verified_at: string | null
          staff_verified_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_extracted?: boolean
          case_id: string
          client_checked_at?: string | null
          client_checked_by?: string | null
          client_note?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_completed?: boolean
          organization_id: string
          packet_id: string
          responsibility: Database["public"]["Enums"]["action_item_responsibility"]
          staff_note?: string | null
          staff_verified_at?: string | null
          staff_verified_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_extracted?: boolean
          case_id?: string
          client_checked_at?: string | null
          client_checked_by?: string | null
          client_note?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_completed?: boolean
          organization_id?: string
          packet_id?: string
          responsibility?: Database["public"]["Enums"]["action_item_responsibility"]
          staff_note?: string | null
          staff_verified_at?: string | null
          staff_verified_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_action_items_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_client_action_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_items_client_checked_by_fkey"
            columns: ["client_checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_items_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "insolvency_client_action_packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_items_staff_verified_by_fkey"
            columns: ["staff_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_client_action_packets: {
        Row: {
          case_id: string
          completed_count: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          ingestion_job_id: string | null
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["action_packet_status"]
          title: string
          total_count: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id: string
          completed_count?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          ingestion_job_id?: string | null
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["action_packet_status"]
          title: string
          total_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          completed_count?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          ingestion_job_id?: string | null
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["action_packet_status"]
          title?: string
          total_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_action_packets_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_client_action_packets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_packets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_packets_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "document_ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_client_action_packets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_collaterals: {
        Row: {
          ai_extracted: boolean
          case_id: string
          collateral_type: Database["public"]["Enums"]["collateral_type"]
          created_at: string
          created_by: string | null
          creditor_id: string
          estimated_value: number | null
          id: string
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          notes: string | null
          organization_id: string
          real_estate_address: string | null
          real_estate_area_sqm: number | null
          real_estate_registry_number: string | null
          secured_claim_amount: number | null
          updated_at: string
          updated_by: string | null
          valuation_basis: string | null
          valuation_date: string | null
          vehicle_model: string | null
          vehicle_registration_number: string | null
          vehicle_year: number | null
        }
        Insert: {
          ai_extracted?: boolean
          case_id: string
          collateral_type: Database["public"]["Enums"]["collateral_type"]
          created_at?: string
          created_by?: string | null
          creditor_id: string
          estimated_value?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id: string
          real_estate_address?: string | null
          real_estate_area_sqm?: number | null
          real_estate_registry_number?: string | null
          secured_claim_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          valuation_basis?: string | null
          valuation_date?: string | null
          vehicle_model?: string | null
          vehicle_registration_number?: string | null
          vehicle_year?: number | null
        }
        Update: {
          ai_extracted?: boolean
          case_id?: string
          collateral_type?: Database["public"]["Enums"]["collateral_type"]
          created_at?: string
          created_by?: string | null
          creditor_id?: string
          estimated_value?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id?: string
          real_estate_address?: string | null
          real_estate_area_sqm?: number | null
          real_estate_registry_number?: string | null
          secured_claim_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          valuation_basis?: string | null
          valuation_date?: string | null
          vehicle_model?: string | null
          vehicle_registration_number?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_collaterals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_collaterals_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_collaterals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_collaterals_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "insolvency_creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_collaterals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_collaterals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_creditor_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_type: string
          created_at: string
          created_by: string | null
          creditor_id: string
          email: string | null
          fax: string | null
          id: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string
          created_at?: string
          created_by?: string | null
          creditor_id: string
          email?: string | null
          fax?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string
          created_at?: string
          created_by?: string | null
          creditor_id?: string
          email?: string | null
          fax?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_creditor_addresses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditor_addresses_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "insolvency_creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditor_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_creditors: {
        Row: {
          account_number_masked: string | null
          ai_confidence_score: number | null
          ai_extracted: boolean
          case_id: string
          claim_class: Database["public"]["Enums"]["creditor_claim_class"]
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          creditor_business_number: string | null
          creditor_name: string
          creditor_national_id_masked: string | null
          creditor_type: Database["public"]["Enums"]["creditor_type"]
          deleted_at: string | null
          guarantor_name: string | null
          has_guarantor: boolean
          id: string
          ingestion_job_id: string | null
          interest_amount: number
          interest_rate_pct: number | null
          is_confirmed: boolean
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          notes: string | null
          organization_id: string
          original_contract_date: string | null
          overdue_since: string | null
          penalty_amount: number
          principal_amount: number
          source_page_reference: string | null
          total_claim_amount: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_number_masked?: string | null
          ai_confidence_score?: number | null
          ai_extracted?: boolean
          case_id: string
          claim_class: Database["public"]["Enums"]["creditor_claim_class"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          creditor_business_number?: string | null
          creditor_name: string
          creditor_national_id_masked?: string | null
          creditor_type?: Database["public"]["Enums"]["creditor_type"]
          deleted_at?: string | null
          guarantor_name?: string | null
          has_guarantor?: boolean
          id?: string
          ingestion_job_id?: string | null
          interest_amount?: number
          interest_rate_pct?: number | null
          is_confirmed?: boolean
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id: string
          original_contract_date?: string | null
          overdue_since?: string | null
          penalty_amount?: number
          principal_amount: number
          source_page_reference?: string | null
          total_claim_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_number_masked?: string | null
          ai_confidence_score?: number | null
          ai_extracted?: boolean
          case_id?: string
          claim_class?: Database["public"]["Enums"]["creditor_claim_class"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          creditor_business_number?: string | null
          creditor_name?: string
          creditor_national_id_masked?: string | null
          creditor_type?: Database["public"]["Enums"]["creditor_type"]
          deleted_at?: string | null
          guarantor_name?: string | null
          has_guarantor?: boolean
          id?: string
          ingestion_job_id?: string | null
          interest_amount?: number
          interest_rate_pct?: number | null
          is_confirmed?: boolean
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id?: string
          original_contract_date?: string | null
          overdue_since?: string | null
          penalty_amount?: number
          principal_amount?: number
          source_page_reference?: string | null
          total_claim_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_creditors_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditors_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_creditors_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditors_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "document_ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_creditors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_filing_bundles: {
        Row: {
          bundle_type: string
          case_id: string
          created_at: string
          created_by: string | null
          creditor_count: number | null
          download_count: number
          expires_at: string | null
          file_size_bytes: number | null
          generation_error: string | null
          id: string
          organization_id: string
          plan_id: string | null
          status: Database["public"]["Enums"]["filing_bundle_status"]
          storage_path: string | null
          total_claim_snapshot: number | null
          updated_at: string
        }
        Insert: {
          bundle_type: string
          case_id: string
          created_at?: string
          created_by?: string | null
          creditor_count?: number | null
          download_count?: number
          expires_at?: string | null
          file_size_bytes?: number | null
          generation_error?: string | null
          id?: string
          organization_id: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["filing_bundle_status"]
          storage_path?: string | null
          total_claim_snapshot?: number | null
          updated_at?: string
        }
        Update: {
          bundle_type?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          creditor_count?: number | null
          download_count?: number
          expires_at?: string | null
          file_size_bytes?: number | null
          generation_error?: string | null
          id?: string
          organization_id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["filing_bundle_status"]
          storage_path?: string | null
          total_claim_snapshot?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_filing_bundles_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_filing_bundles_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_filing_bundles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_filing_bundles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_filing_bundles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insolvency_repayment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_priority_claims: {
        Row: {
          case_id: string
          confirmed_priority_amount: number
          created_at: string
          created_by: string | null
          creditor_id: string
          employment_period_from: string | null
          employment_period_to: string | null
          id: string
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          notes: string | null
          organization_id: string
          priority_basis_text: string | null
          priority_subtype: Database["public"]["Enums"]["priority_claim_subtype"]
          statutory_priority_cap: number | null
          tax_notice_number: string | null
          tax_period_from: string | null
          tax_period_to: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id: string
          confirmed_priority_amount?: number
          created_at?: string
          created_by?: string | null
          creditor_id: string
          employment_period_from?: string | null
          employment_period_to?: string | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id: string
          priority_basis_text?: string | null
          priority_subtype: Database["public"]["Enums"]["priority_claim_subtype"]
          statutory_priority_cap?: number | null
          tax_notice_number?: string | null
          tax_period_from?: string | null
          tax_period_to?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          confirmed_priority_amount?: number
          created_at?: string
          created_by?: string | null
          creditor_id?: string
          employment_period_from?: string | null
          employment_period_to?: string | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          notes?: string | null
          organization_id?: string
          priority_basis_text?: string | null
          priority_subtype?: Database["public"]["Enums"]["priority_claim_subtype"]
          statutory_priority_cap?: number | null
          tax_notice_number?: string | null
          tax_period_from?: string | null
          tax_period_to?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_priority_claims_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_priority_claims_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_priority_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_priority_claims_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "insolvency_creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_priority_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_priority_claims_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_repayment_allocations: {
        Row: {
          allocated_amount: number
          claim_class: Database["public"]["Enums"]["creditor_claim_class"]
          created_at: string
          creditor_id: string
          id: string
          monthly_installment: number | null
          notes: string | null
          organization_id: string
          original_claim_amount: number
          plan_id: string
          repayment_rate_pct: number | null
          secured_shortage_amount: number | null
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          claim_class: Database["public"]["Enums"]["creditor_claim_class"]
          created_at?: string
          creditor_id: string
          id?: string
          monthly_installment?: number | null
          notes?: string | null
          organization_id: string
          original_claim_amount: number
          plan_id: string
          repayment_rate_pct?: number | null
          secured_shortage_amount?: number | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          claim_class?: Database["public"]["Enums"]["creditor_claim_class"]
          created_at?: string
          creditor_id?: string
          id?: string
          monthly_installment?: number | null
          notes?: string | null
          organization_id?: string
          original_claim_amount?: number
          plan_id?: string
          repayment_rate_pct?: number | null
          secured_shortage_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_repayment_allocations_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "insolvency_creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insolvency_repayment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_repayment_plans: {
        Row: {
          approved_at: string | null
          case_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          court_case_number: string | null
          created_at: string
          created_by: string | null
          filed_at: string | null
          general_repayment_pool: number | null
          general_repayment_rate_pct: number | null
          id: string
          insolvency_subtype:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          monthly_disposable: number | null
          monthly_income: number
          monthly_living_cost: number
          notes: string | null
          organization_id: string
          plan_end_date: string | null
          plan_start_date: string | null
          rejection_reason: string | null
          repayment_months: number
          status: Database["public"]["Enums"]["repayment_plan_status"]
          total_claim_amount: number | null
          total_general_claim: number
          total_priority_claim: number
          total_repayment_amount: number | null
          total_secured_claim: number
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          case_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          court_case_number?: string | null
          created_at?: string
          created_by?: string | null
          filed_at?: string | null
          general_repayment_pool?: number | null
          general_repayment_rate_pct?: number | null
          id?: string
          insolvency_subtype?:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          monthly_disposable?: number | null
          monthly_income?: number
          monthly_living_cost?: number
          notes?: string | null
          organization_id: string
          plan_end_date?: string | null
          plan_start_date?: string | null
          rejection_reason?: string | null
          repayment_months: number
          status?: Database["public"]["Enums"]["repayment_plan_status"]
          total_claim_amount?: number | null
          total_general_claim?: number
          total_priority_claim?: number
          total_repayment_amount?: number | null
          total_secured_claim?: number
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          case_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          court_case_number?: string | null
          created_at?: string
          created_by?: string | null
          filed_at?: string | null
          general_repayment_pool?: number | null
          general_repayment_rate_pct?: number | null
          id?: string
          insolvency_subtype?:
            | Database["public"]["Enums"]["insolvency_subtype"]
            | null
          monthly_disposable?: number | null
          monthly_income?: number
          monthly_living_cost?: number
          notes?: string | null
          organization_id?: string
          plan_end_date?: string | null
          plan_start_date?: string | null
          rejection_reason?: string | null
          repayment_months?: number
          status?: Database["public"]["Enums"]["repayment_plan_status"]
          total_claim_amount?: number | null
          total_general_claim?: number
          total_priority_claim?: number
          total_repayment_amount?: number | null
          total_secured_claim?: number
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "insolvency_repayment_plans_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_plans_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "insolvency_repayment_plans_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insolvency_repayment_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insolvency_ruleset_constants: {
        Row: {
          created_at: string
          display_name: string
          effective_from: string
          effective_to: string | null
          id: string
          legal_basis: string | null
          notes: string | null
          region_code: string | null
          ruleset_key: string
          value_amount: number | null
          value_pct: number | null
        }
        Insert: {
          created_at?: string
          display_name: string
          effective_from: string
          effective_to?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          region_code?: string | null
          ruleset_key: string
          value_amount?: number | null
          value_pct?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          region_code?: string | null
          ruleset_key?: string
          value_amount?: number | null
          value_pct?: number | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          actor_category: string | null
          case_client_id: string | null
          case_id: string | null
          case_scope_policy: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invited_name: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          note: string | null
          organization_id: string
          permissions_override: Json
          requested_role: Database["public"]["Enums"]["membership_role"] | null
          revoked_at: string | null
          role_template_key: string | null
          share_token: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          token_hint: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          actor_category?: string | null
          case_client_id?: string | null
          case_id?: string | null
          case_scope_policy?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invited_name?: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          note?: string | null
          organization_id: string
          permissions_override?: Json
          requested_role?: Database["public"]["Enums"]["membership_role"] | null
          revoked_at?: string | null
          role_template_key?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          token_hint?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          actor_category?: string | null
          case_client_id?: string | null
          case_id?: string | null
          case_scope_policy?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_name?: string | null
          kind?: Database["public"]["Enums"]["invitation_kind"]
          note?: string | null
          organization_id?: string
          permissions_override?: Json
          requested_role?: Database["public"]["Enums"]["membership_role"] | null
          revoked_at?: string | null
          role_template_key?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          token_hint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_case_client_id_fkey"
            columns: ["case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          billing_entry_id: string | null
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          tax_amount: number
          title: string
          total_amount: number
        }
        Insert: {
          amount?: number
          billing_entry_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          tax_amount?: number
          title: string
          total_amount?: number
        }
        Update: {
          amount?: number
          billing_entry_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          tax_amount?: number
          title?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_billing_entry_id_fkey"
            columns: ["billing_entry_id"]
            isOneToOne: false
            referencedRelation: "billing_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bill_to_case_client_id: string | null
          bill_to_case_organization_id: string | null
          bill_to_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id: string
          case_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_on: string | null
          id: string
          invoice_no: string
          issued_at: string | null
          paid_at: string | null
          pdf_storage_path: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount: number
          tax_amount: number
          title: string
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id: string
          case_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          invoice_no: string
          issued_at?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount?: number
          tax_amount?: number
          title: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bill_to_case_client_id?: string | null
          bill_to_case_organization_id?: string | null
          bill_to_party_kind?: Database["public"]["Enums"]["billing_party_kind"]
          billing_owner_case_organization_id?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          invoice_no?: string
          issued_at?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount?: number
          tax_amount?: number
          title?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bill_to_case_client_id_fkey"
            columns: ["bill_to_case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_bill_to_case_organization_id_fkey"
            columns: ["bill_to_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_billing_owner_case_organization_id_fkey"
            columns: ["billing_owner_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kakao_notification_outbox: {
        Row: {
          created_at: string
          failed_reason: string | null
          id: string
          notification_id: string | null
          payload: Json
          recipient_profile_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          failed_reason?: string | null
          id?: string
          notification_id?: string | null
          payload?: Json
          recipient_profile_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          failed_reason?: string | null
          id?: string
          notification_id?: string | null
          payload?: Json
          recipient_profile_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kakao_notification_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kakao_notification_outbox_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_private_profiles: {
        Row: {
          address_line1_ciphertext: string | null
          address_line2_ciphertext: string | null
          created_at: string
          profile_id: string
          resident_number_ciphertext: string | null
          resident_number_masked: string | null
          updated_at: string
        }
        Insert: {
          address_line1_ciphertext?: string | null
          address_line2_ciphertext?: string | null
          created_at?: string
          profile_id: string
          resident_number_ciphertext?: string | null
          resident_number_masked?: string | null
          updated_at?: string
        }
        Update: {
          address_line1_ciphertext?: string | null
          address_line2_ciphertext?: string | null
          created_at?: string
          profile_id?: string
          resident_number_ciphertext?: string | null
          resident_number_masked?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_private_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channel_preferences: {
        Row: {
          allow_case: boolean
          allow_client: boolean
          allow_collaboration: boolean
          allow_schedule: boolean
          kakao_enabled: boolean
          kakao_important_only: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          allow_case?: boolean
          allow_client?: boolean
          allow_collaboration?: boolean
          allow_schedule?: boolean
          kakao_enabled?: boolean
          kakao_important_only?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          allow_case?: boolean
          allow_client?: boolean
          allow_collaboration?: boolean
          allow_schedule?: boolean
          kakao_enabled?: boolean
          kakao_important_only?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_channel_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_entity_type: string | null
          action_href: string | null
          action_label: string | null
          action_target_id: string | null
          archived_at: string | null
          body: string
          case_id: string | null
          created_at: string
          deleted_at: string | null
          destination_params: Json
          destination_type: string
          destination_url: string
          entity_id: string | null
          entity_type: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          notification_type: string
          organization_id: string | null
          payload: Json
          priority: string
          read_at: string | null
          recipient_profile_id: string
          requires_action: boolean
          resolved_at: string | null
          snoozed_until: string | null
          status: string
          title: string
          trashed_at: string | null
          trashed_by: string | null
        }
        Insert: {
          action_entity_type?: string | null
          action_href?: string | null
          action_label?: string | null
          action_target_id?: string | null
          archived_at?: string | null
          body: string
          case_id?: string | null
          created_at?: string
          deleted_at?: string | null
          destination_params?: Json
          destination_type?: string
          destination_url?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          notification_type?: string
          organization_id?: string | null
          payload?: Json
          priority?: string
          read_at?: string | null
          recipient_profile_id: string
          requires_action?: boolean
          resolved_at?: string | null
          snoozed_until?: string | null
          status?: string
          title: string
          trashed_at?: string | null
          trashed_by?: string | null
        }
        Update: {
          action_entity_type?: string | null
          action_href?: string | null
          action_label?: string | null
          action_target_id?: string | null
          archived_at?: string | null
          body?: string
          case_id?: string | null
          created_at?: string
          deleted_at?: string | null
          destination_params?: Json
          destination_type?: string
          destination_url?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          notification_type?: string
          organization_id?: string | null
          payload?: Json
          priority?: string
          read_at?: string | null
          recipient_profile_id?: string
          requires_action?: boolean
          resolved_at?: string | null
          snoozed_until?: string | null
          status?: string
          title?: string
          trashed_at?: string | null
          trashed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trashed_by_fkey"
            columns: ["trashed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settlement_entries: {
        Row: {
          amount: number
          case_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_on: string | null
          id: string
          paid_at: string | null
          source_case_organization_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          target_case_organization_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          paid_at?: string | null
          source_case_organization_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          target_case_organization_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          paid_at?: string | null
          source_case_organization_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          target_case_organization_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settlement_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_settlement_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_settlement_entries_source_case_organization_id_fkey"
            columns: ["source_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_settlement_entries_target_case_organization_id_fkey"
            columns: ["target_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_settlement_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_collaboration_case_shares: {
        Row: {
          case_id: string
          created_at: string
          hub_id: string
          id: string
          note: string | null
          permission_scope: string
          shared_by_organization_id: string
          shared_by_profile_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          hub_id: string
          id?: string
          note?: string | null
          permission_scope?: string
          shared_by_organization_id: string
          shared_by_profile_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          hub_id?: string
          id?: string
          note?: string | null
          permission_scope?: string
          shared_by_organization_id?: string
          shared_by_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_collaboration_case__shared_by_organization_id_fkey"
            columns: ["shared_by_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_case_share_shared_by_profile_id_fkey"
            columns: ["shared_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_case_shares_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_case_shares_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "organization_collaboration_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_collaboration_hubs: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          id: string
          partner_organization_id: string
          primary_organization_id: string
          request_id: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          partner_organization_id: string
          primary_organization_id: string
          request_id?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          partner_organization_id?: string
          primary_organization_id?: string
          request_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_collaboration_hubs_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_hubs_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_hubs_primary_organization_id_fkey"
            columns: ["primary_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_hubs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "organization_collaboration_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_collaboration_messages: {
        Row: {
          body: string
          case_id: string | null
          created_at: string
          hub_id: string
          id: string
          metadata: Json
          organization_id: string
          sender_profile_id: string
        }
        Insert: {
          body: string
          case_id?: string | null
          created_at?: string
          hub_id: string
          id?: string
          metadata?: Json
          organization_id: string
          sender_profile_id: string
        }
        Update: {
          body?: string
          case_id?: string | null
          created_at?: string
          hub_id?: string
          id?: string
          metadata?: Json
          organization_id?: string
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_collaboration_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_messages_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "organization_collaboration_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_collaboration_reads: {
        Row: {
          created_at: string
          hub_id: string
          id: string
          last_read_at: string
          organization_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hub_id: string
          id?: string
          last_read_at?: string
          organization_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hub_id?: string
          id?: string
          last_read_at?: string
          organization_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_collaboration_reads_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "organization_collaboration_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_reads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_collaboration_requests: {
        Row: {
          approved_at: string | null
          approved_hub_id: string | null
          created_at: string
          id: string
          proposal_note: string | null
          requested_by_profile_id: string
          response_note: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          source_organization_id: string
          status: Database["public"]["Enums"]["collaboration_request_status"]
          target_organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_hub_id?: string | null
          created_at?: string
          id?: string
          proposal_note?: string | null
          requested_by_profile_id: string
          response_note?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_organization_id: string
          status?: Database["public"]["Enums"]["collaboration_request_status"]
          target_organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_hub_id?: string | null
          created_at?: string
          id?: string
          proposal_note?: string | null
          requested_by_profile_id?: string
          response_note?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_organization_id?: string
          status?: Database["public"]["Enums"]["collaboration_request_status"]
          target_organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_collaboration_request_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_requests_approved_hub_id_fkey"
            columns: ["approved_hub_id"]
            isOneToOne: false
            referencedRelation: "organization_collaboration_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_requests_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_requests_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_collaboration_requests_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_exit_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          requested_by_profile_id: string
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          reviewed_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          requested_by_profile_id: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          reviewed_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          requested_by_profile_id?: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          reviewed_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_exit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_exit_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_exit_requests_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_membership_permission_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          effect: Database["public"]["Enums"]["permission_override_effect"]
          id: string
          organization_membership_id: string
          permission_key: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effect: Database["public"]["Enums"]["permission_override_effect"]
          id?: string
          organization_membership_id: string
          permission_key: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effect?: Database["public"]["Enums"]["permission_override_effect"]
          id?: string
          organization_membership_id?: string
          permission_key?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_membership_permiss_organization_membership_id_fkey"
            columns: ["organization_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_membership_permission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          actor_category: Database["public"]["Enums"]["org_actor_category"]
          case_scope_policy: Database["public"]["Enums"]["case_scope_policy"]
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
          permission_template_key: string | null
          permissions: Json
          profile_id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          actor_category?: Database["public"]["Enums"]["org_actor_category"]
          case_scope_policy?: Database["public"]["Enums"]["case_scope_policy"]
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
          permission_template_key?: string | null
          permissions?: Json
          profile_id: string
          role: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          actor_category?: Database["public"]["Enums"]["org_actor_category"]
          case_scope_policy?: Database["public"]["Enums"]["case_scope_policy"]
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          permission_template_key?: string | null
          permissions?: Json
          profile_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_relations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          relation_type: Database["public"]["Enums"]["organization_relation_type"]
          source_organization_id: string
          target_organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          relation_type: Database["public"]["Enums"]["organization_relation_type"]
          source_organization_id: string
          target_organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          relation_type?: Database["public"]["Enums"]["organization_relation_type"]
          source_organization_id?: string
          target_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_relations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_relations_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_relations_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          id: string
          key: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          value_json: Json
          version: number
        }
        Insert: {
          id?: string
          key: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          value_json: Json
          version?: number
        }
        Update: {
          id?: string
          key?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "setting_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_signup_requests: {
        Row: {
          approval_locked_at: string | null
          approval_locked_by_profile_id: string | null
          approved_organization_id: string | null
          business_number: string | null
          business_registration_document_mime_type: string | null
          business_registration_document_name: string | null
          business_registration_document_path: string | null
          business_registration_document_size: number | null
          business_registration_verification_note: string | null
          business_registration_verification_status: string
          business_registration_verified_at: string | null
          business_registration_verified_number: string | null
          contact_phone: string | null
          created_at: string
          id: string
          note: string | null
          organization_industry: string | null
          organization_kind: Database["public"]["Enums"]["organization_kind"]
          organization_name: string
          representative_name: string | null
          representative_title: string | null
          requested_modules: Json
          requester_email: string
          requester_profile_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_note: string | null
          status: Database["public"]["Enums"]["organization_signup_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          approval_locked_at?: string | null
          approval_locked_by_profile_id?: string | null
          approved_organization_id?: string | null
          business_number?: string | null
          business_registration_document_mime_type?: string | null
          business_registration_document_name?: string | null
          business_registration_document_path?: string | null
          business_registration_document_size?: number | null
          business_registration_verification_note?: string | null
          business_registration_verification_status?: string
          business_registration_verified_at?: string | null
          business_registration_verified_number?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_industry?: string | null
          organization_kind?: Database["public"]["Enums"]["organization_kind"]
          organization_name: string
          representative_name?: string | null
          representative_title?: string | null
          requested_modules?: Json
          requester_email: string
          requester_profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_note?: string | null
          status?: Database["public"]["Enums"]["organization_signup_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          approval_locked_at?: string | null
          approval_locked_by_profile_id?: string | null
          approved_organization_id?: string | null
          business_number?: string | null
          business_registration_document_mime_type?: string | null
          business_registration_document_name?: string | null
          business_registration_document_path?: string | null
          business_registration_document_size?: number | null
          business_registration_verification_note?: string | null
          business_registration_verification_status?: string
          business_registration_verified_at?: string | null
          business_registration_verified_number?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_industry?: string | null
          organization_kind?: Database["public"]["Enums"]["organization_kind"]
          organization_name?: string
          representative_name?: string | null
          representative_title?: string | null
          requested_modules?: Json
          requester_email?: string
          requester_profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_note?: string | null
          status?: Database["public"]["Enums"]["organization_signup_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_signup_requests_approval_locked_by_profile_id_fkey"
            columns: ["approval_locked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_signup_requests_approved_organization_id_fkey"
            columns: ["approved_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_signup_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_signup_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_staff_temp_credentials: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          issued_by: string | null
          last_password_changed_at: string | null
          login_email: string
          login_id: string
          login_id_normalized: string
          must_change_password: boolean
          organization_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          issued_by?: string | null
          last_password_changed_at?: string | null
          login_email: string
          login_id: string
          login_id_normalized: string
          must_change_password?: boolean
          organization_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          issued_by?: string | null
          last_password_changed_at?: string | null
          login_email?: string
          login_id?: string
          login_id_normalized?: string
          must_change_password?: boolean
          organization_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_staff_temp_credentials_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_temp_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_temp_credentials_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscription_states: {
        Row: {
          cancelled_at: string | null
          created_at: string
          export_allowed_when_cancelled: boolean
          lock_reason: string | null
          locked_hard_at: string | null
          locked_soft_at: string | null
          organization_id: string
          past_due_started_at: string | null
          plan_code: string | null
          renewal_due_at: string | null
          state: Database["public"]["Enums"]["subscription_state"]
          trial_end_at: string | null
          trial_start_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          export_allowed_when_cancelled?: boolean
          lock_reason?: string | null
          locked_hard_at?: string | null
          locked_soft_at?: string | null
          organization_id: string
          past_due_started_at?: string | null
          plan_code?: string | null
          renewal_due_at?: string | null
          state?: Database["public"]["Enums"]["subscription_state"]
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          export_allowed_when_cancelled?: boolean
          lock_reason?: string | null
          locked_hard_at?: string | null
          locked_soft_at?: string | null
          organization_id?: string
          past_due_started_at?: string | null
          plan_code?: string | null
          renewal_due_at?: string | null
          state?: Database["public"]["Enums"]["subscription_state"]
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscription_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscription_states_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_number: string | null
          created_at: string
          created_by: string | null
          email: string | null
          enabled_modules: Json
          id: string
          is_directory_public: boolean
          is_platform_root: boolean
          kind: Database["public"]["Enums"]["organization_kind"]
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          name: string
          onboarding_status: string
          organization_industry: string | null
          phone: string | null
          postal_code: string | null
          representative_name: string | null
          representative_title: string | null
          retention_class: Database["public"]["Enums"]["retention_class"]
          slug: string
          source_signup_request_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled_modules?: Json
          id?: string
          is_directory_public?: boolean
          is_platform_root?: boolean
          kind?: Database["public"]["Enums"]["organization_kind"]
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          name: string
          onboarding_status?: string
          organization_industry?: string | null
          phone?: string | null
          postal_code?: string | null
          representative_name?: string | null
          representative_title?: string | null
          retention_class?: Database["public"]["Enums"]["retention_class"]
          slug: string
          source_signup_request_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled_modules?: Json
          id?: string
          is_directory_public?: boolean
          is_platform_root?: boolean
          kind?: Database["public"]["Enums"]["organization_kind"]
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          name?: string
          onboarding_status?: string
          organization_industry?: string | null
          phone?: string | null
          postal_code?: string | null
          representative_name?: string | null
          representative_title?: string | null
          retention_class?: Database["public"]["Enums"]["retention_class"]
          slug?: string
          source_signup_request_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_source_signup_request_id_fkey"
            columns: ["source_signup_request_id"]
            isOneToOne: false
            referencedRelation: "organization_signup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          invoice_item_id: string | null
          payment_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          invoice_item_id?: string | null
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          invoice_item_id?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          billing_owner_case_organization_id: string
          case_id: string
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          payer_case_client_id: string | null
          payer_case_organization_id: string | null
          payer_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          received_at: string
          reference_text: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          billing_owner_case_organization_id: string
          case_id: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payer_case_client_id?: string | null
          payer_case_organization_id?: string | null
          payer_party_kind: Database["public"]["Enums"]["billing_party_kind"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          received_at: string
          reference_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          billing_owner_case_organization_id?: string
          case_id?: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payer_case_client_id?: string | null
          payer_case_organization_id?: string | null
          payer_party_kind?: Database["public"]["Enums"]["billing_party_kind"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          received_at?: string
          reference_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_billing_owner_case_organization_id_fkey"
            columns: ["billing_owner_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_case_client_id_fkey"
            columns: ["payer_case_client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_case_organization_id_fkey"
            columns: ["payer_case_organization_id"]
            isOneToOne: false
            referencedRelation: "case_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_template_items: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          template_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          template_key: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_template_items_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      permission_templates: {
        Row: {
          actor_category: Database["public"]["Enums"]["org_actor_category"]
          created_at: string
          description: string | null
          display_name: string
          is_system: boolean
          key: string
        }
        Insert: {
          actor_category: Database["public"]["Enums"]["org_actor_category"]
          created_at?: string
          description?: string | null
          display_name: string
          is_system?: boolean
          key: string
        }
        Update: {
          actor_category?: Database["public"]["Enums"]["org_actor_category"]
          created_at?: string
          description?: string | null
          display_name?: string
          is_system?: boolean
          key?: string
        }
        Relationships: []
      }
      platform_runtime_settings: {
        Row: {
          created_at: string
          platform_organization_id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          platform_organization_id: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          platform_organization_id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_runtime_settings_platform_organization_id_fkey"
            columns: ["platform_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value_json: Json
          version: number
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value_json: Json
          version?: number
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_key_fkey"
            columns: ["key"]
            isOneToOne: true
            referencedRelation: "setting_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_account_status: string
          client_account_status_changed_at: string
          client_account_status_reason: string | null
          client_last_approved_at: string | null
          created_at: string
          default_organization_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_client_account: boolean
          legal_name: string | null
          legal_name_confirmed_at: string | null
          must_change_password: boolean
          must_complete_profile: boolean
          phone_e164: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_account_status?: string
          client_account_status_changed_at?: string
          client_account_status_reason?: string | null
          client_last_approved_at?: string | null
          created_at?: string
          default_organization_id?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_client_account?: boolean
          legal_name?: string | null
          legal_name_confirmed_at?: string | null
          must_change_password?: boolean
          must_complete_profile?: boolean
          phone_e164?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_account_status?: string
          client_account_status_changed_at?: string
          client_account_status_reason?: string | null
          client_last_approved_at?: string | null
          created_at?: string
          default_organization_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_client_account?: boolean
          legal_name?: string | null
          legal_name_confirmed_at?: string | null
          must_change_password?: boolean
          must_complete_profile?: boolean
          phone_e164?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_organization_fk"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          window_start: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id: string
          window_start?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          window_start?: string
        }
        Relationships: []
      }
      rehabilitation_affidavits: {
        Row: {
          case_id: string
          created_at: string
          debt_history: string | null
          id: string
          income_change: string | null
          living_situation: string | null
          organization_id: string
          property_change: string | null
          repay_feasibility: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          debt_history?: string | null
          id?: string
          income_change?: string | null
          living_situation?: string | null
          organization_id: string
          property_change?: string | null
          repay_feasibility?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          debt_history?: string | null
          id?: string
          income_change?: string | null
          living_situation?: string | null
          organization_id?: string
          property_change?: string | null
          repay_feasibility?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_affidavits_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_affidavits_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_applications: {
        Row: {
          agent_address: Json | null
          agent_email: string | null
          agent_fax: string | null
          agent_law_firm: string | null
          agent_name: string | null
          agent_phone: string | null
          agent_type: string | null
          applicant_name: string | null
          application_date: string | null
          case_id: string
          case_number: string | null
          case_year: number | null
          concurrent_discharge: boolean
          court_detail: string | null
          court_name: string | null
          created_at: string
          created_by: string | null
          current_address: Json | null
          delegation_form: boolean
          ecourt_agreement: boolean
          employer_name: string | null
          extra_income_name: string | null
          extra_income_source: string | null
          has_extra_income: boolean
          id: string
          income_type: string | null
          info_request_form: boolean
          judge_division: string | null
          lifecycle_status: string
          office_address: Json | null
          organization_id: string
          phone_home: string | null
          phone_mobile: string | null
          position: string | null
          prior_applications: Json | null
          registered_address: Json | null
          repayment_start_date: string | null
          repayment_start_day: number | null
          repayment_start_uncertain: boolean
          representative_lawyer: string | null
          resident_number_front: string | null
          resident_number_hash: string | null
          return_account: string | null
          service_address: Json | null
          service_recipient: string | null
          trustee_bank_account: string | null
          trustee_bank_name: string | null
          updated_at: string
          updated_by: string | null
          work_period: string | null
        }
        Insert: {
          agent_address?: Json | null
          agent_email?: string | null
          agent_fax?: string | null
          agent_law_firm?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_type?: string | null
          applicant_name?: string | null
          application_date?: string | null
          case_id: string
          case_number?: string | null
          case_year?: number | null
          concurrent_discharge?: boolean
          court_detail?: string | null
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: Json | null
          delegation_form?: boolean
          ecourt_agreement?: boolean
          employer_name?: string | null
          extra_income_name?: string | null
          extra_income_source?: string | null
          has_extra_income?: boolean
          id?: string
          income_type?: string | null
          info_request_form?: boolean
          judge_division?: string | null
          lifecycle_status?: string
          office_address?: Json | null
          organization_id: string
          phone_home?: string | null
          phone_mobile?: string | null
          position?: string | null
          prior_applications?: Json | null
          registered_address?: Json | null
          repayment_start_date?: string | null
          repayment_start_day?: number | null
          repayment_start_uncertain?: boolean
          representative_lawyer?: string | null
          resident_number_front?: string | null
          resident_number_hash?: string | null
          return_account?: string | null
          service_address?: Json | null
          service_recipient?: string | null
          trustee_bank_account?: string | null
          trustee_bank_name?: string | null
          updated_at?: string
          updated_by?: string | null
          work_period?: string | null
        }
        Update: {
          agent_address?: Json | null
          agent_email?: string | null
          agent_fax?: string | null
          agent_law_firm?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_type?: string | null
          applicant_name?: string | null
          application_date?: string | null
          case_id?: string
          case_number?: string | null
          case_year?: number | null
          concurrent_discharge?: boolean
          court_detail?: string | null
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: Json | null
          delegation_form?: boolean
          ecourt_agreement?: boolean
          employer_name?: string | null
          extra_income_name?: string | null
          extra_income_source?: string | null
          has_extra_income?: boolean
          id?: string
          income_type?: string | null
          info_request_form?: boolean
          judge_division?: string | null
          lifecycle_status?: string
          office_address?: Json | null
          organization_id?: string
          phone_home?: string | null
          phone_mobile?: string | null
          position?: string | null
          prior_applications?: Json | null
          registered_address?: Json | null
          repayment_start_date?: string | null
          repayment_start_day?: number | null
          repayment_start_uncertain?: boolean
          representative_lawyer?: string | null
          resident_number_front?: string | null
          resident_number_hash?: string | null
          return_account?: string | null
          service_address?: Json | null
          service_recipient?: string | null
          trustee_bank_account?: string | null
          trustee_bank_name?: string | null
          updated_at?: string
          updated_by?: string | null
          work_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rehab_applications_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_applications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_applications_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_creditor_settings: {
        Row: {
          bond_date: string | null
          case_id: string
          copy_with_evidence: boolean
          created_at: string
          id: string
          list_date: string | null
          organization_id: string
          repay_type: string
          summary_table: boolean
          updated_at: string
        }
        Insert: {
          bond_date?: string | null
          case_id: string
          copy_with_evidence?: boolean
          created_at?: string
          id?: string
          list_date?: string | null
          organization_id: string
          repay_type?: string
          summary_table?: boolean
          updated_at?: string
        }
        Update: {
          bond_date?: string | null
          case_id?: string
          copy_with_evidence?: boolean
          created_at?: string
          id?: string
          list_date?: string | null
          organization_id?: string
          repay_type?: string
          summary_table?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_cred_settings_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_creditor_settings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_creditors: {
        Row: {
          address: string | null
          apply_restructuring: boolean
          attachments: number[]
          bond_cause: string | null
          bond_content: string | null
          bond_number: number
          branch_name: string | null
          capital: number
          capital_compute: string | null
          case_id: string
          classify: string
          created_at: string
          creditor_name: string
          delay_rate: number
          fax: string | null
          guarantor_amount: number
          guarantor_name: string | null
          guarantor_resident_hash: string | null
          guarantor_text: string | null
          has_objection: boolean
          has_priority_repay: boolean
          id: string
          interest: number
          interest_compute: string | null
          is_annuity_debt: boolean
          is_other_unconfirmed: boolean
          is_secured: boolean
          is_unsettled: boolean
          lien_priority: number
          lien_type: string | null
          lifecycle_status: string
          max_claim_amount: number
          mobile: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          remaining_unsecured: number
          repay_capital: number
          repay_interest: number
          repay_monthly: number
          repay_ratio: number
          repay_total: number
          secured_collateral_value: number
          secured_property_id: string | null
          sort_order: number
          unsettled_amount: number
          unsettled_reason: string | null
          unsettled_text: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          apply_restructuring?: boolean
          attachments?: number[]
          bond_cause?: string | null
          bond_content?: string | null
          bond_number: number
          branch_name?: string | null
          capital?: number
          capital_compute?: string | null
          case_id: string
          classify?: string
          created_at?: string
          creditor_name?: string
          delay_rate?: number
          fax?: string | null
          guarantor_amount?: number
          guarantor_name?: string | null
          guarantor_resident_hash?: string | null
          guarantor_text?: string | null
          has_objection?: boolean
          has_priority_repay?: boolean
          id?: string
          interest?: number
          interest_compute?: string | null
          is_annuity_debt?: boolean
          is_other_unconfirmed?: boolean
          is_secured?: boolean
          is_unsettled?: boolean
          lien_priority?: number
          lien_type?: string | null
          lifecycle_status?: string
          max_claim_amount?: number
          mobile?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          remaining_unsecured?: number
          repay_capital?: number
          repay_interest?: number
          repay_monthly?: number
          repay_ratio?: number
          repay_total?: number
          secured_collateral_value?: number
          secured_property_id?: string | null
          sort_order?: number
          unsettled_amount?: number
          unsettled_reason?: string | null
          unsettled_text?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          apply_restructuring?: boolean
          attachments?: number[]
          bond_cause?: string | null
          bond_content?: string | null
          bond_number?: number
          branch_name?: string | null
          capital?: number
          capital_compute?: string | null
          case_id?: string
          classify?: string
          created_at?: string
          creditor_name?: string
          delay_rate?: number
          fax?: string | null
          guarantor_amount?: number
          guarantor_name?: string | null
          guarantor_resident_hash?: string | null
          guarantor_text?: string | null
          has_objection?: boolean
          has_priority_repay?: boolean
          id?: string
          interest?: number
          interest_compute?: string | null
          is_annuity_debt?: boolean
          is_other_unconfirmed?: boolean
          is_secured?: boolean
          is_unsettled?: boolean
          lien_priority?: number
          lien_type?: string | null
          lifecycle_status?: string
          max_claim_amount?: number
          mobile?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          remaining_unsecured?: number
          repay_capital?: number
          repay_interest?: number
          repay_monthly?: number
          repay_ratio?: number
          repay_total?: number
          secured_collateral_value?: number
          secured_property_id?: string | null
          sort_order?: number
          unsettled_amount?: number
          unsettled_reason?: string | null
          unsettled_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_creditors_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_creditors_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_creditors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_creditors_secured_property_id_fkey"
            columns: ["secured_property_id"]
            isOneToOne: false
            referencedRelation: "rehabilitation_secured_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_family_members: {
        Row: {
          age: string | null
          case_id: string
          cohabitation: string | null
          created_at: string
          id: string
          is_dependent: boolean
          lifecycle_status: string
          member_name: string
          monthly_income: number
          occupation: string | null
          organization_id: string
          relation: string
          sort_order: number
          total_property: number
          updated_at: string
        }
        Insert: {
          age?: string | null
          case_id: string
          cohabitation?: string | null
          created_at?: string
          id?: string
          is_dependent?: boolean
          lifecycle_status?: string
          member_name: string
          monthly_income?: number
          occupation?: string | null
          organization_id: string
          relation: string
          sort_order?: number
          total_property?: number
          updated_at?: string
        }
        Update: {
          age?: string | null
          case_id?: string
          cohabitation?: string | null
          created_at?: string
          id?: string
          is_dependent?: boolean
          lifecycle_status?: string
          member_name?: string
          monthly_income?: number
          occupation?: string | null
          organization_id?: string
          relation?: string
          sort_order?: number
          total_property?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_family_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_family_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_income_settings: {
        Row: {
          case_id: string
          child_support: number
          created_at: string
          dispose_amount: number
          dispose_period: string | null
          expense_breakdown: Json | null
          extra_income: number
          extra_living_cost: number
          extra_living_percent: number
          gross_salary: number
          id: string
          income_breakdown: Json | null
          liquidation_guaranteed: boolean
          liquidation_value: number
          living_cost: number
          living_cost_direct: boolean
          living_cost_range: string
          living_cost_rate: number
          median_income_year: number
          monthly_available: number
          monthly_repay: number
          net_salary: number
          organization_id: string
          period_setting: number
          repay_months: number | null
          repay_period_option: string | null
          repay_rate: number
          repay_rate_display: string
          repayment_method: string
          secured_debt: number
          total_capital: number
          total_debt: number
          total_interest: number
          total_repay_amount: number
          trustee_account: string | null
          trustee_comm_rate: number
          trustee_name: string | null
          unsecured_debt: number
          updated_at: string
        }
        Insert: {
          case_id: string
          child_support?: number
          created_at?: string
          dispose_amount?: number
          dispose_period?: string | null
          expense_breakdown?: Json | null
          extra_income?: number
          extra_living_cost?: number
          extra_living_percent?: number
          gross_salary?: number
          id?: string
          income_breakdown?: Json | null
          liquidation_guaranteed?: boolean
          liquidation_value?: number
          living_cost?: number
          living_cost_direct?: boolean
          living_cost_range?: string
          living_cost_rate?: number
          median_income_year?: number
          monthly_available?: number
          monthly_repay?: number
          net_salary?: number
          organization_id: string
          period_setting?: number
          repay_months?: number | null
          repay_period_option?: string | null
          repay_rate?: number
          repay_rate_display?: string
          repayment_method?: string
          secured_debt?: number
          total_capital?: number
          total_debt?: number
          total_interest?: number
          total_repay_amount?: number
          trustee_account?: string | null
          trustee_comm_rate?: number
          trustee_name?: string | null
          unsecured_debt?: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          child_support?: number
          created_at?: string
          dispose_amount?: number
          dispose_period?: string | null
          expense_breakdown?: Json | null
          extra_income?: number
          extra_living_cost?: number
          extra_living_percent?: number
          gross_salary?: number
          id?: string
          income_breakdown?: Json | null
          liquidation_guaranteed?: boolean
          liquidation_value?: number
          living_cost?: number
          living_cost_direct?: boolean
          living_cost_range?: string
          living_cost_rate?: number
          median_income_year?: number
          monthly_available?: number
          monthly_repay?: number
          net_salary?: number
          organization_id?: string
          period_setting?: number
          repay_months?: number | null
          repay_period_option?: string | null
          repay_rate?: number
          repay_rate_display?: string
          repayment_method?: string
          secured_debt?: number
          total_capital?: number
          total_debt?: number
          total_interest?: number
          total_repay_amount?: number
          trustee_account?: string | null
          trustee_comm_rate?: number
          trustee_name?: string | null
          unsecured_debt?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_income_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_income_settings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_plan_sections: {
        Row: {
          case_id: string
          content: string | null
          created_at: string
          id: string
          organization_id: string
          section_number: number
          updated_at: string
        }
        Insert: {
          case_id: string
          content?: string | null
          created_at?: string
          id?: string
          organization_id: string
          section_number: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          section_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_plan_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_plan_sections_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_prohibition_orders: {
        Row: {
          agent_address: string | null
          agent_fax: string | null
          agent_law_firm: string | null
          agent_name: string | null
          agent_phone: string | null
          agent_type: string | null
          applicant_name: string | null
          application_date: string | null
          attachments: string[]
          case_id: string
          court_name: string | null
          created_at: string
          creditor_count: number
          current_address: string | null
          has_agent: boolean
          id: string
          organization_id: string
          reason_detail: string | null
          registered_address: string | null
          resident_number_front: string | null
          total_debt_amount: number
          updated_at: string
        }
        Insert: {
          agent_address?: string | null
          agent_fax?: string | null
          agent_law_firm?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_type?: string | null
          applicant_name?: string | null
          application_date?: string | null
          attachments?: string[]
          case_id: string
          court_name?: string | null
          created_at?: string
          creditor_count?: number
          current_address?: string | null
          has_agent?: boolean
          id?: string
          organization_id: string
          reason_detail?: string | null
          registered_address?: string | null
          resident_number_front?: string | null
          total_debt_amount?: number
          updated_at?: string
        }
        Update: {
          agent_address?: string | null
          agent_fax?: string | null
          agent_law_firm?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_type?: string | null
          applicant_name?: string | null
          application_date?: string | null
          attachments?: string[]
          case_id?: string
          court_name?: string | null
          created_at?: string
          creditor_count?: number
          current_address?: string | null
          has_agent?: boolean
          id?: string
          organization_id?: string
          reason_detail?: string | null
          registered_address?: string | null
          resident_number_front?: string | null
          total_debt_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_prohibition_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_prohibition_orders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_prohibition_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_properties: {
        Row: {
          amount: number
          case_id: string
          category: string
          created_at: string
          detail: string | null
          has_lien: boolean
          id: string
          is_protection: boolean
          lien_amount: number
          lien_holder: string | null
          lifecycle_status: string
          liquidation_value: number
          organization_id: string
          repay_use: string
          secured_property_id: string | null
          seizure: string
          sort_order: number
          structured_detail: Json | null
          updated_at: string
        }
        Insert: {
          amount?: number
          case_id: string
          category: string
          created_at?: string
          detail?: string | null
          has_lien?: boolean
          id?: string
          is_protection?: boolean
          lien_amount?: number
          lien_holder?: string | null
          lifecycle_status?: string
          liquidation_value?: number
          organization_id: string
          repay_use?: string
          secured_property_id?: string | null
          seizure?: string
          sort_order?: number
          structured_detail?: Json | null
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          category?: string
          created_at?: string
          detail?: string | null
          has_lien?: boolean
          id?: string
          is_protection?: boolean
          lien_amount?: number
          lien_holder?: string | null
          lifecycle_status?: string
          liquidation_value?: number
          organization_id?: string
          repay_use?: string
          secured_property_id?: string | null
          seizure?: string
          sort_order?: number
          structured_detail?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_properties_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_properties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehabilitation_properties_secured_property_id_fkey"
            columns: ["secured_property_id"]
            isOneToOne: false
            referencedRelation: "rehabilitation_secured_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_property_deductions: {
        Row: {
          case_id: string
          category: string
          deduction_amount: number
          id: string
          organization_id: string
        }
        Insert: {
          case_id: string
          category: string
          deduction_amount?: number
          id?: string
          organization_id: string
        }
        Update: {
          case_id?: string
          category?: string
          deduction_amount?: number
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_prop_deductions_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_property_deductions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rehabilitation_secured_properties: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          id: string
          lifecycle_status: string
          market_value: number
          note: string | null
          organization_id: string
          property_type: string
          sort_order: number
          updated_at: string
          valuation_rate: number
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          id?: string
          lifecycle_status?: string
          market_value?: number
          note?: string | null
          organization_id: string
          property_type?: string
          sort_order?: number
          updated_at?: string
          valuation_rate?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lifecycle_status?: string
          market_value?: number
          note?: string | null
          organization_id?: string
          property_type?: string
          sort_order?: number
          updated_at?: string
          valuation_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "rehab_secured_case_org_fk"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rehabilitation_secured_properties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      setting_catalog: {
        Row: {
          cache_scope: string
          created_at: string
          default_value_json: Json
          description: string
          domain: string
          editable_by_org_admin: boolean
          editable_by_platform_admin: boolean
          is_read_only: boolean
          key: string
          scope: Database["public"]["Enums"]["setting_scope"]
          updated_at: string
          validator_schema_key: string | null
          value_type: Database["public"]["Enums"]["setting_value_type"]
        }
        Insert: {
          cache_scope?: string
          created_at?: string
          default_value_json: Json
          description: string
          domain: string
          editable_by_org_admin?: boolean
          editable_by_platform_admin?: boolean
          is_read_only?: boolean
          key: string
          scope: Database["public"]["Enums"]["setting_scope"]
          updated_at?: string
          validator_schema_key?: string | null
          value_type: Database["public"]["Enums"]["setting_value_type"]
        }
        Update: {
          cache_scope?: string
          created_at?: string
          default_value_json?: Json
          description?: string
          domain?: string
          editable_by_org_admin?: boolean
          editable_by_platform_admin?: boolean
          is_read_only?: boolean
          key?: string
          scope?: Database["public"]["Enums"]["setting_scope"]
          updated_at?: string
          validator_schema_key?: string | null
          value_type?: Database["public"]["Enums"]["setting_value_type"]
        }
        Relationships: []
      }
      setting_change_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_value_json: Json | null
          old_value_json: Json | null
          organization_id: string | null
          reason: string | null
          rolled_back_from_log_id: string | null
          target_key: string
          target_type: Database["public"]["Enums"]["setting_target_type"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value_json?: Json | null
          old_value_json?: Json | null
          organization_id?: string | null
          reason?: string | null
          rolled_back_from_log_id?: string | null
          target_key: string
          target_type: Database["public"]["Enums"]["setting_target_type"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value_json?: Json | null
          old_value_json?: Json | null
          organization_id?: string | null
          reason?: string | null
          rolled_back_from_log_id?: string | null
          target_key?: string
          target_type?: Database["public"]["Enums"]["setting_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "setting_change_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setting_change_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setting_change_logs_rolled_back_from_log_id_fkey"
            columns: ["rolled_back_from_log_id"]
            isOneToOne: false
            referencedRelation: "setting_change_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_access_requests: {
        Row: {
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          organization_name_snapshot: string
          reason: string
          requested_at: string
          requested_by: string
          requested_by_name: string
          status: Database["public"]["Enums"]["support_request_status"]
          target_email_snapshot: string
          target_name_snapshot: string
          target_profile_id: string
          updated_at: string
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          organization_id: string
          organization_name_snapshot: string
          reason: string
          requested_at?: string
          requested_by: string
          requested_by_name: string
          status?: Database["public"]["Enums"]["support_request_status"]
          target_email_snapshot: string
          target_name_snapshot: string
          target_profile_id: string
          updated_at?: string
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          organization_name_snapshot?: string
          reason?: string
          requested_at?: string
          requested_by?: string
          requested_by_name?: string
          status?: Database["public"]["Enums"]["support_request_status"]
          target_email_snapshot?: string
          target_name_snapshot?: string
          target_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_access_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_access_requests_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_organization_signup_request_atomic: {
        Args: {
          p_request_id: string
          p_review_note?: string
          p_reviewer_profile_id: string
        }
        Returns: {
          organization_id: string
          request_status: string
        }[]
      }
      cancel_organization_signup_request_atomic: {
        Args: { p_request_id: string }
        Returns: {
          approval_locked_at: string | null
          approval_locked_by_profile_id: string | null
          approved_organization_id: string | null
          business_number: string | null
          business_registration_document_mime_type: string | null
          business_registration_document_name: string | null
          business_registration_document_path: string | null
          business_registration_document_size: number | null
          business_registration_verification_note: string | null
          business_registration_verification_status: string
          business_registration_verified_at: string | null
          business_registration_verified_number: string | null
          contact_phone: string | null
          created_at: string
          id: string
          note: string | null
          organization_industry: string | null
          organization_kind: Database["public"]["Enums"]["organization_kind"]
          organization_name: string
          representative_name: string | null
          representative_title: string | null
          requested_modules: Json
          requester_email: string
          requester_profile_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_note: string | null
          status: Database["public"]["Enums"]["organization_signup_status"]
          updated_at: string
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_signup_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_case_atomic: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_can_manage_collection: boolean
          p_case_number: string
          p_case_type: string
          p_client_name?: string
          p_client_role?: string
          p_court_name: string
          p_insolvency_subtype?: string
          p_module_flags: Json
          p_opened_on: string
          p_organization_id: string
          p_principal_amount: number
          p_reference_no: string
          p_stage_key: string
          p_stage_template_key: string
          p_summary: string
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      action_item_responsibility:
        | "client_self"
        | "client_visit"
        | "office_prepare"
      action_packet_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      approval_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "stale"
      billing_agreement_type:
        | "retainer"
        | "flat_fee"
        | "success_fee"
        | "expense_reimbursement"
        | "installment_plan"
        | "internal_settlement"
      billing_entry_kind:
        | "retainer"
        | "success_fee"
        | "expense"
        | "invoice"
        | "payment"
        | "adjustment"
        | "retainer_fee"
        | "flat_fee"
        | "court_fee"
        | "service_fee"
        | "discount"
        | "internal_settlement"
      billing_party_kind: "case_client" | "case_organization"
      billing_status: "draft" | "issued" | "partial" | "paid" | "void"
      case_access_scope:
        | "full"
        | "collection_only"
        | "legal_only"
        | "billing_only"
        | "read_only"
      case_billing_scope:
        | "none"
        | "direct_client_billing"
        | "upstream_settlement"
        | "internal_settlement_only"
      case_client_link_status:
        | "linked"
        | "pending_unlink"
        | "unlinked"
        | "orphan_review"
      case_client_orphan_reason:
        | "profile_detached"
        | "hub_detached"
        | "case_reassignment"
        | "source_deleted"
        | "manual_cleanup"
        | "migration_review"
      case_client_relink_policy:
        | "manual_review"
        | "auto_when_profile_returns"
        | "auto_when_case_relinked"
        | "admin_override_only"
      case_communication_scope:
        | "internal_only"
        | "cross_org_only"
        | "client_visible"
      case_hub_organization_status: "active" | "pending" | "unlinked"
      case_organization_role:
        | "managing_org"
        | "principal_client_org"
        | "collection_org"
        | "legal_counsel_org"
        | "co_counsel_org"
        | "partner_org"
      case_organization_status: "active" | "pending" | "ended"
      case_request_kind:
        | "question"
        | "document_submission"
        | "document_request"
        | "schedule_request"
        | "call_request"
        | "meeting_request"
        | "status_check"
        | "signature_request"
        | "other"
      case_request_status:
        | "open"
        | "in_review"
        | "waiting_client"
        | "completed"
        | "rejected"
        | "cancelled"
      case_scope_policy:
        | "all_org_cases"
        | "assigned_cases_only"
        | "read_only_assigned"
      case_status:
        | "intake"
        | "active"
        | "pending_review"
        | "approved"
        | "closed"
        | "archived"
      case_type:
        | "civil"
        | "debt_collection"
        | "execution"
        | "injunction"
        | "criminal"
        | "advisory"
        | "other"
        | "insolvency"
      client_access_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      client_visibility: "internal_only" | "client_visible"
      collaboration_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "withdrawn"
      collateral_type:
        | "real_estate"
        | "vehicle"
        | "deposit_account"
        | "insurance"
        | "other"
      compensation_entry_status: "projected" | "confirmed" | "paid" | "void"
      compensation_plan_status: "draft" | "fixed" | "superseded"
      compensation_target_kind: "membership" | "organization"
      content_status: "draft" | "published" | "archived"
      creditor_claim_class: "secured" | "priority" | "general"
      creditor_type:
        | "financial_institution"
        | "government"
        | "individual"
        | "corporation"
        | "other"
      document_kind:
        | "complaint"
        | "answer"
        | "brief"
        | "evidence"
        | "contract"
        | "order"
        | "notice"
        | "opinion"
        | "internal_memo"
        | "other"
      entity_type: "individual" | "corporation"
      filing_bundle_status:
        | "generating"
        | "ready"
        | "submitted"
        | "expired"
        | "failed"
      ingestion_document_type:
        | "debt_certificate"
        | "registration_abstract"
        | "resident_abstract"
        | "income_certificate"
        | "asset_declaration"
        | "correction_order"
        | "correction_recommendation"
        | "other"
      ingestion_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      insolvency_subtype:
        | "individual_rehabilitation"
        | "individual_bankruptcy"
        | "corporate_rehabilitation"
        | "corporate_bankruptcy"
      invitation_kind: "staff_invite" | "client_invite"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
        | "written_off"
      lifecycle_status: "active" | "soft_deleted" | "archived" | "legal_hold"
      membership_role: "org_owner" | "org_manager" | "org_staff"
      membership_status: "active" | "invited" | "suspended"
      notification_kind:
        | "case_assigned"
        | "approval_requested"
        | "approval_completed"
        | "schedule_due"
        | "collection_update"
        | "support_request"
        | "generic"
      org_actor_category: "admin" | "staff"
      organization_kind:
        | "law_firm"
        | "collection_company"
        | "mixed_practice"
        | "corporate_legal_team"
        | "other"
        | "platform_management"
      organization_relation_type:
        | "same_group"
        | "same_legal_entity"
        | "partner"
        | "collection_partner"
        | "legal_partner"
        | "shared_operations"
        | "internal_affiliate"
      organization_signup_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      party_role:
        | "creditor"
        | "debtor"
        | "plaintiff"
        | "defendant"
        | "respondent"
        | "petitioner"
        | "other"
      payment_method: "bank_transfer" | "card" | "cash" | "offset" | "other"
      payment_status: "pending" | "confirmed" | "reversed"
      permission_override_effect: "grant" | "deny"
      platform_role: "platform_admin" | "platform_support" | "standard"
      priority_claim_subtype:
        | "national_tax"
        | "local_tax"
        | "social_insurance"
        | "wage_arrears"
        | "lease_deposit"
        | "child_support"
        | "other_priority"
      recovery_activity_kind:
        | "call"
        | "letter"
        | "visit"
        | "negotiation"
        | "payment"
        | "asset_check"
        | "legal_action"
        | "other"
      repayment_plan_status:
        | "draft"
        | "confirmed"
        | "filed"
        | "approved"
        | "rejected"
        | "cancelled"
      retention_class:
        | "commercial_10y"
        | "document_5y"
        | "litigation_25y"
        | "permanent"
      schedule_kind:
        | "hearing"
        | "deadline"
        | "meeting"
        | "reminder"
        | "collection_visit"
        | "other"
      setting_scope: "platform" | "organization" | "both"
      setting_target_type:
        | "platform_setting"
        | "organization_setting"
        | "content_resource"
        | "feature_flag"
      setting_value_type:
        | "string"
        | "integer"
        | "decimal"
        | "boolean"
        | "string_array"
        | "json"
      settlement_status: "draft" | "confirmed" | "paid" | "void"
      subscription_state:
        | "trialing"
        | "active"
        | "past_due"
        | "locked_soft"
        | "locked_hard"
        | "cancelled"
      support_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "consumed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_item_responsibility: [
        "client_self",
        "client_visit",
        "office_prepare",
      ],
      action_packet_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      approval_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "stale",
      ],
      billing_agreement_type: [
        "retainer",
        "flat_fee",
        "success_fee",
        "expense_reimbursement",
        "installment_plan",
        "internal_settlement",
      ],
      billing_entry_kind: [
        "retainer",
        "success_fee",
        "expense",
        "invoice",
        "payment",
        "adjustment",
        "retainer_fee",
        "flat_fee",
        "court_fee",
        "service_fee",
        "discount",
        "internal_settlement",
      ],
      billing_party_kind: ["case_client", "case_organization"],
      billing_status: ["draft", "issued", "partial", "paid", "void"],
      case_access_scope: [
        "full",
        "collection_only",
        "legal_only",
        "billing_only",
        "read_only",
      ],
      case_billing_scope: [
        "none",
        "direct_client_billing",
        "upstream_settlement",
        "internal_settlement_only",
      ],
      case_client_link_status: [
        "linked",
        "pending_unlink",
        "unlinked",
        "orphan_review",
      ],
      case_client_orphan_reason: [
        "profile_detached",
        "hub_detached",
        "case_reassignment",
        "source_deleted",
        "manual_cleanup",
        "migration_review",
      ],
      case_client_relink_policy: [
        "manual_review",
        "auto_when_profile_returns",
        "auto_when_case_relinked",
        "admin_override_only",
      ],
      case_communication_scope: [
        "internal_only",
        "cross_org_only",
        "client_visible",
      ],
      case_hub_organization_status: ["active", "pending", "unlinked"],
      case_organization_role: [
        "managing_org",
        "principal_client_org",
        "collection_org",
        "legal_counsel_org",
        "co_counsel_org",
        "partner_org",
      ],
      case_organization_status: ["active", "pending", "ended"],
      case_request_kind: [
        "question",
        "document_submission",
        "document_request",
        "schedule_request",
        "call_request",
        "meeting_request",
        "status_check",
        "signature_request",
        "other",
      ],
      case_request_status: [
        "open",
        "in_review",
        "waiting_client",
        "completed",
        "rejected",
        "cancelled",
      ],
      case_scope_policy: [
        "all_org_cases",
        "assigned_cases_only",
        "read_only_assigned",
      ],
      case_status: [
        "intake",
        "active",
        "pending_review",
        "approved",
        "closed",
        "archived",
      ],
      case_type: [
        "civil",
        "debt_collection",
        "execution",
        "injunction",
        "criminal",
        "advisory",
        "other",
        "insolvency",
      ],
      client_access_request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      client_visibility: ["internal_only", "client_visible"],
      collaboration_request_status: [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
      ],
      collateral_type: [
        "real_estate",
        "vehicle",
        "deposit_account",
        "insurance",
        "other",
      ],
      compensation_entry_status: ["projected", "confirmed", "paid", "void"],
      compensation_plan_status: ["draft", "fixed", "superseded"],
      compensation_target_kind: ["membership", "organization"],
      content_status: ["draft", "published", "archived"],
      creditor_claim_class: ["secured", "priority", "general"],
      creditor_type: [
        "financial_institution",
        "government",
        "individual",
        "corporation",
        "other",
      ],
      document_kind: [
        "complaint",
        "answer",
        "brief",
        "evidence",
        "contract",
        "order",
        "notice",
        "opinion",
        "internal_memo",
        "other",
      ],
      entity_type: ["individual", "corporation"],
      filing_bundle_status: [
        "generating",
        "ready",
        "submitted",
        "expired",
        "failed",
      ],
      ingestion_document_type: [
        "debt_certificate",
        "registration_abstract",
        "resident_abstract",
        "income_certificate",
        "asset_declaration",
        "correction_order",
        "correction_recommendation",
        "other",
      ],
      ingestion_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      insolvency_subtype: [
        "individual_rehabilitation",
        "individual_bankruptcy",
        "corporate_rehabilitation",
        "corporate_bankruptcy",
      ],
      invitation_kind: ["staff_invite", "client_invite"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
        "written_off",
      ],
      lifecycle_status: ["active", "soft_deleted", "archived", "legal_hold"],
      membership_role: ["org_owner", "org_manager", "org_staff"],
      membership_status: ["active", "invited", "suspended"],
      notification_kind: [
        "case_assigned",
        "approval_requested",
        "approval_completed",
        "schedule_due",
        "collection_update",
        "support_request",
        "generic",
      ],
      org_actor_category: ["admin", "staff"],
      organization_kind: [
        "law_firm",
        "collection_company",
        "mixed_practice",
        "corporate_legal_team",
        "other",
        "platform_management",
      ],
      organization_relation_type: [
        "same_group",
        "same_legal_entity",
        "partner",
        "collection_partner",
        "legal_partner",
        "shared_operations",
        "internal_affiliate",
      ],
      organization_signup_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      party_role: [
        "creditor",
        "debtor",
        "plaintiff",
        "defendant",
        "respondent",
        "petitioner",
        "other",
      ],
      payment_method: ["bank_transfer", "card", "cash", "offset", "other"],
      payment_status: ["pending", "confirmed", "reversed"],
      permission_override_effect: ["grant", "deny"],
      platform_role: ["platform_admin", "platform_support", "standard"],
      priority_claim_subtype: [
        "national_tax",
        "local_tax",
        "social_insurance",
        "wage_arrears",
        "lease_deposit",
        "child_support",
        "other_priority",
      ],
      recovery_activity_kind: [
        "call",
        "letter",
        "visit",
        "negotiation",
        "payment",
        "asset_check",
        "legal_action",
        "other",
      ],
      repayment_plan_status: [
        "draft",
        "confirmed",
        "filed",
        "approved",
        "rejected",
        "cancelled",
      ],
      retention_class: [
        "commercial_10y",
        "document_5y",
        "litigation_25y",
        "permanent",
      ],
      schedule_kind: [
        "hearing",
        "deadline",
        "meeting",
        "reminder",
        "collection_visit",
        "other",
      ],
      setting_scope: ["platform", "organization", "both"],
      setting_target_type: [
        "platform_setting",
        "organization_setting",
        "content_resource",
        "feature_flag",
      ],
      setting_value_type: [
        "string",
        "integer",
        "decimal",
        "boolean",
        "string_array",
        "json",
      ],
      settlement_status: ["draft", "confirmed", "paid", "void"],
      subscription_state: [
        "trialing",
        "active",
        "past_due",
        "locked_soft",
        "locked_hard",
        "cancelled",
      ],
      support_request_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "consumed",
      ],
    },
  },
} as const

