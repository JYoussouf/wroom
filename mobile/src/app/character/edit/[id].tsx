import { useLocalSearchParams } from "expo-router";
import { CharacterEditorForm } from "@/components/CharacterEditorForm";

export default function EditCharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CharacterEditorForm editId={id} />;
}
