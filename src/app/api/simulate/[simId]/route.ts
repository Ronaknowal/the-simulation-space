export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ simId: string }> }
) {
  const { simId } = await params;
  return Response.json({
    id: simId,
    status: 'completed',
    message: 'Simulation data available via SSE stream',
  });
}
