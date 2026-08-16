import { Range } from './components/Range'
import { Select } from './components/Select'
import { Textarea } from './components/Textarea'

// Namespace, not a component: Textarea/Select/Range are three separate DOM elements sharing one
// stylesheet (focus ring, placeholder color) — there's nothing to render as `<Input>` itself.
export const Input = { Textarea, Select, Range }
