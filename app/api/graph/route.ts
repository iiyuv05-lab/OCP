import { projectCanonicalGraph, recordedTimeOptions, timelinePoints } from "../../ocp-data";
import { projectionKeys, type ProjectionKey, type RepLens } from "../../view-specs";

const lenses: RepLens[] = ["all", "chronology", "generation", "relevance"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedView = url.searchParams.get("view") as ProjectionKey | null;
  const projection = requestedView && projectionKeys.includes(requestedView) ? requestedView : "product-project";
  const validAt = Number(url.searchParams.get("validAt")) || timelinePoints[3].validAt;
  const recordedAt = Number(url.searchParams.get("recordedAt")) || recordedTimeOptions.at(-1)!.recordedAt;
  const requestedLens = url.searchParams.get("repLens") as RepLens | null;
  const repLens = requestedLens && lenses.includes(requestedLens) ? requestedLens : "all";
  const graph = projectCanonicalGraph(projection, validAt, recordedAt, repLens);
  return Response.json({
    graph,
    meta: {
      canonicalVersion: "0.1",
      viewSpec: projection,
      viewSpecVersion: 1,
      validAt,
      recordedAt,
      repLens,
      layout: "ephemeral",
      persistedCoordinates: false,
    },
  });
}
