export const getNogginTotalIncurredCost_OMNISCIENT = async (
  prisma: any,
  {
    nogginId,
  }: {
    nogginId: number;
  },
): Promise<number> => {
  // let's just do this in sql
  // of course don't love that this doesn't track with status, but such is life
  const [{ totalCost }] = (await prisma.$queryRaw`
    select
      sum(coalesce("NogginRunCost"."computedCostQuastra", "NogginRunCost"."estimatedCostQuastra", 0)) as "totalCost"
    from "NogginRun"
    inner join "NogginRunCost" on "NogginRun"."id" = "NogginRunCost"."nogginRunId"
    where "NogginRun"."nogginRevisionId" in (
      select id from "NogginRevision" where "NogginRevision"."nogginId" = ${nogginId}
    )
  `) as { totalCost: number }[];

  return totalCost || 0;
};

export const getTotalOrganizationSpendForUser_OMNISCIENT = async (
  prisma: any,
  {
    organizationId,
    userId,
  }: {
    organizationId: number;
    userId: number;
  },
): Promise<number> => {
  // TODO i think we should put the 'and userId = ' in the subquery
  // maybe keep it outside, too, idk, but right now this page is slow
  // and presumably it's because we fetch all the nogs in the org, then join and then filter
  const [{ totalCost }] = (await prisma.$queryRaw`
    select
      sum(coalesce("NogginRunCost"."computedCostQuastra", "NogginRunCost"."estimatedCostQuastra", 0)) as "totalCost"
    from "NogginRun"
    inner join "NogginRunCost" on "NogginRun"."id" = "NogginRunCost"."nogginRunId"
    inner join "NogginRevision" on "NogginRun"."nogginRevisionId" = "NogginRevision"."id"
    inner join "Noggin" on "NogginRevision"."nogginId" = "Noggin"."id"
    where "NogginRun"."nogginRevisionId" in (
      select id from "NogginRevision" where "NogginRevision"."nogginId" in (
        select id from "Noggin" where "Noggin"."parentOrgId" = ${organizationId}
      )
    )
    and "Noggin"."userOwnerId" = ${userId}
  `) as { totalCost: number }[];

  return totalCost || 0;
};
