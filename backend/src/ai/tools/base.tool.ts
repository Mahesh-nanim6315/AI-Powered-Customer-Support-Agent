/*
  Base Tool Interface
  Every AI tool must extend this structure
*/

export interface ToolExecutionContext {
  ticketId: string;
  orgId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;

  /*
    JSON schema-like input definition.
    This is shown to the LLM in tool selection prompt.
  */
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Tool {
  definition: ToolDefinition;

  execute(
    input: any,
    context: ToolExecutionContext
  ): Promise<any>;
}

/*
  Abstract Base Tool Class (optional but recommended)
*/

export abstract class BaseTool implements Tool {
  abstract definition: ToolDefinition;

  abstract execute(
    input: any,
    context: ToolExecutionContext
  ): Promise<any>;

  /*
    Optional input validation hook
  */
  protected validateRequiredFields(
    input: any,
    requiredFields: string[]
  ) {
    for (const field of requiredFields) {
      if (!(field in input)) {
        throw new Error(
          `Missing required field: ${field}`
        );
      }
    }
  }
}