from fastapi import Depends

import core
from services.ai import analyze_problem as analyze_problem_service


@core.api_router.post("/ai/analyze-problem")
async def analyze_problem(
    problem: core.ProblemAnalyzeRequest,
    current_user: dict = Depends(core.get_current_user),
):
    return await analyze_problem_service(problem.model_dump())
