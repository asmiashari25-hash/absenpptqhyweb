
import React from 'react';

export const Icon = ({ name, className }: { name: string, className?: string }) => (
  <i className={`fas fa-${name} ${className || ''}`}></i>
);