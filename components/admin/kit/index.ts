// =============================================================================
// VOZNYA — COMMAND CENTER FOUNDATION KIT (barrel)
// =============================================================================
//
// The shared admin platform. Every Command Center module (Content, Assets,
// Collections, Cases, Economy, LiveOps, Seasons, Players, Investigation, Alerts)
// is built from these primitives + a data source — NOT a bespoke page. This is
// the substrate that turns Command Center from a dashboard into an OS.
//
// Extracted from the first real admin product (Asset Studio). See
// docs/VOZNYA_CC_FOUNDATION_EXTRACTION_MAP.md.
// =============================================================================

export { DataTable, type Column } from './data-table'
export {
  AdminForm,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Toggle,
  SubmitButton,
  fieldInputClass,
} from './admin-form'
export { AdminModal } from './admin-modal'
export { AssetUpload } from './asset-upload'
export { PublishControl } from './publish-control'
export { StatusPill } from './status-pill'
export { AuditTrail } from './audit-trail'
export { Feedback, type FeedbackMsg } from './feedback'
export { useAdminMutation, type AdminMutation } from './use-admin-mutation'
