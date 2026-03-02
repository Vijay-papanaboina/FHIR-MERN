export interface PortalCareTeamMemberDTO {
  userId: string;
  name: string;
  image?: string;
  assignmentRole: "primary" | "covering" | "consulting";
}
