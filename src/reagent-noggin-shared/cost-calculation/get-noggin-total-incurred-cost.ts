export const getNogginTotalIncurredCost_OMNISCIENT = async (
  prisma: any,
  {
    nogginId,
  }: {
    nogginId: number;
  },
) => {
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
