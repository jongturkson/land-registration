import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { MortgageSchema } from '../../shared/schemas/title.schema';

class EncumbranceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// POST /titles/:title_no/mortgage — registers an hypothèque against the title.
// The encumbrance and its ledger entry commit atomically.
export async function registerMortgage(req: Request, res: Response): Promise<void> {
  const title_no = req.params['title_no'] as string;

  const parse = MortgageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { creditor, amount, notes } = parse.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const title = await tx.title.findUnique({ where: { title_no } });

      if (!title) {
        throw new EncumbranceError(404, 'Title not found');
      }
      if (title.status !== 'VALID') {
        throw new EncumbranceError(409, 'Encumbrances can only be registered on VALID titles');
      }

      const encumbrance = await tx.encumbrance.create({
        data: {
          title_id: title.id,
          kind: 'MORTGAGE',
          party: creditor,
          status: 'ACTIVE',
        },
      });

      await appendLog(
        req.user!.id,
        req.user!.role,
        'MORTGAGE_ADDED',
        'TITLE',
        title.id,
        {
          title_no: title.title_no,
          encumbrance_id: encumbrance.id,
          creditor,
          amount: amount ?? null,
          notes: notes ?? null,
        },
        tx,
      );

      return { title, encumbrance };
    });

    res.status(201).json({
      message: 'Mortgage registered successfully',
      title_no: result.title.title_no,
      encumbrance: result.encumbrance,
    });
  } catch (err) {
    if (err instanceof EncumbranceError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    throw err;
  }
}
