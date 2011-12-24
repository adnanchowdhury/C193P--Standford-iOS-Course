//
//  CalculatorBrain.h
//  Calculator
//
//  Created by Adnan Chowdhury on 23/12/2011.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface CalculatorBrain : NSObject

- (void) pushOperand:(double)operand;
- (double) performOperation: (NSString *)operation;

@end
