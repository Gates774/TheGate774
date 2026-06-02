-- Create volunteer_opportunities table
CREATE TABLE public.volunteer_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  location_type TEXT NOT NULL DEFAULT 'lga',
  target_state TEXT,
  target_lga TEXT,
  start_date DATE,
  end_date DATE,
  spots_available INTEGER DEFAULT 0,
  spots_filled INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  image_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create volunteer_applications table
CREATE TABLE public.volunteer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.volunteer_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  motivation TEXT,
  experience TEXT,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, user_id)
);

-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'poll',
  scope TEXT NOT NULL DEFAULT 'lga',
  target_state TEXT,
  target_lga TEXT,
  target_lga_type TEXT DEFAULT 'origin',
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_anonymous BOOLEAN DEFAULT true,
  allow_multiple_responses BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_questions table
CREATE TABLE public.poll_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice',
  options JSONB,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_responses table
CREATE TABLE public.poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create poll_answers table
CREATE TABLE public.poll_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.poll_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.poll_questions(id) ON DELETE CASCADE,
  answer_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_answers ENABLE ROW LEVEL SECURITY;

-- Volunteer opportunities policies
CREATE POLICY "Anyone can view active volunteer opportunities"
ON public.volunteer_opportunities FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can manage all volunteer opportunities"
ON public.volunteer_opportunities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Volunteer applications policies
CREATE POLICY "Users can view their own applications"
ON public.volunteer_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
ON public.volunteer_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending applications"
ON public.volunteer_applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
ON public.volunteer_applications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all applications"
ON public.volunteer_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Polls policies
CREATE POLICY "Users can view active polls targeting their LGA"
ON public.polls FOR SELECT
USING (
  status = 'active' AND (
    scope = 'national' OR
    (scope = 'state' AND target_state = (SELECT state FROM public.profiles WHERE user_id = auth.uid())) OR
    (scope = 'lga' AND (
      (target_lga_type = 'origin' AND target_lga = (SELECT lga_origin FROM public.profiles WHERE user_id = auth.uid())) OR
      (target_lga_type = 'residence' AND target_lga = (SELECT lga_residence FROM public.profiles WHERE user_id = auth.uid())) OR
      (target_lga_type = 'both' AND (
        target_lga = (SELECT lga_origin FROM public.profiles WHERE user_id = auth.uid()) OR
        target_lga = (SELECT lga_residence FROM public.profiles WHERE user_id = auth.uid())
      ))
    ))
  )
);

CREATE POLICY "Admins can manage all polls"
ON public.polls FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Poll questions policies
CREATE POLICY "Users can view questions for accessible polls"
ON public.poll_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.polls WHERE id = poll_id AND (
    status = 'active' OR has_role(auth.uid(), 'admin'::app_role)
  )
));

CREATE POLICY "Admins can manage poll questions"
ON public.poll_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Poll responses policies
CREATE POLICY "Users can view their own responses"
ON public.poll_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit responses to active polls"
ON public.poll_responses FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND status = 'active')
);

CREATE POLICY "Admins can view all responses"
ON public.poll_responses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Poll answers policies
CREATE POLICY "Users can view their own answers"
ON public.poll_answers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.poll_responses WHERE id = response_id AND user_id = auth.uid()
));

CREATE POLICY "Users can submit answers with their responses"
ON public.poll_answers FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.poll_responses WHERE id = response_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all answers"
ON public.poll_answers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_volunteer_opportunities_status ON public.volunteer_opportunities(status);
CREATE INDEX idx_volunteer_opportunities_target ON public.volunteer_opportunities(target_state, target_lga);
CREATE INDEX idx_volunteer_applications_user ON public.volunteer_applications(user_id);
CREATE INDEX idx_volunteer_applications_opportunity ON public.volunteer_applications(opportunity_id);
CREATE INDEX idx_polls_status ON public.polls(status);
CREATE INDEX idx_polls_scope ON public.polls(scope, target_state, target_lga);
CREATE INDEX idx_poll_responses_poll ON public.poll_responses(poll_id);
CREATE INDEX idx_poll_responses_user ON public.poll_responses(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_volunteer_opportunities_updated_at
BEFORE UPDATE ON public.volunteer_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_applications_updated_at
BEFORE UPDATE ON public.volunteer_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();