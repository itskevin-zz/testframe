import { useMemo } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import type { Options } from 'easymde';
import 'easymde/dist/easymde.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

const MarkdownEditor = ({ value, onChange, placeholder, id }: MarkdownEditorProps) => {
  const options = useMemo<Options>(() => ({
    spellChecker: false,
    placeholder: placeholder || 'Enter text...',
    status: false,
    toolbar: [
      'bold',
      'italic',
      'heading',
      '|',
      'unordered-list',
      'ordered-list',
      '|',
      'link',
      'quote',
      'code',
      '|',
      'preview',
      'guide',
    ],
    // Auto-continue lists
    autoDownloadFontAwesome: false,
  }), [placeholder]);

  return (
    <div className="markdown-editor-wrapper" id={id}>
      <SimpleMDE
        value={value}
        onChange={onChange}
        options={options}
      />
    </div>
  );
};

export default MarkdownEditor;
