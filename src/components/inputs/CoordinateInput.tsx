import React from 'react';
import { CoordinateGrid } from '../CoordinateGrid';

interface Props {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
}

export const CoordinateInput: React.FC<Props> = ({
  input,
  setInput,
  onSubmit,
}) => {
  return <CoordinateGrid value={input} onChange={setInput} onSubmit={onSubmit} />;
};
