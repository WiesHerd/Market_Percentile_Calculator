import { toast } from "sonner";
import { ColumnMapping } from "../types";

interface SaveOptions {
  maxRetries?: number;
  initialDelay?: number;
}

export async function saveMappingsWithRetry(
  surveyId: string,
  columnMappings: ColumnMapping,
  progress: number,
  options: SaveOptions = {}
): Promise<boolean> {
  const { maxRetries = 3, initialDelay = 1000 } = options;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnMappings,
          mappingProgress: progress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Verify the saved data matches what we tried to save
      if (JSON.stringify(data.columnMappings) !== JSON.stringify(columnMappings)) {
        throw new Error("Saved data does not match local state");
      }

      toast.success("Column mappings saved successfully");
      return true;
    } catch (error) {
      attempt++;
      
      if (attempt === maxRetries) {
        console.error("Failed to save column mappings:", error);
        toast.error(
          `Failed to save column mappings after ${maxRetries} attempts. Please try again.`
        );
        return false;
      }

      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      toast.warning(
        `Retrying save attempt ${attempt} of ${maxRetries}...`,
        { duration: 2000 }
      );
    }
  }

  return false;
}

export async function handleContinueToSpecialtyMapping(
  surveyId: string,
  columnMappings: ColumnMapping,
  progress: number,
  onSuccess: () => void
): Promise<void> {
  const saveResult = await saveMappingsWithRetry(surveyId, columnMappings, progress);
  
  if (saveResult) {
    onSuccess();
  }
} 