//
//  CalculatorBrain.m
//  Calculator
//
//  Created by Adnan Chowdhury on 23/12/2011.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import "CalculatorBrain.h"



@interface CalculatorBrain()
@property (nonatomic, strong) NSMutableArray *operandStack;
@end

@implementation CalculatorBrain

@synthesize operandStack = _operandStack;

//Create operandStack getter
- (NSMutableArray *)operandStack {
    if (!_operandStack) {
        _operandStack = [[NSMutableArray alloc] init]; //Lazy instantiation
    }
    return _operandStack;
}

//Create popOperand getter
- (double)popOperand {
    NSNumber *operandObject = [self.operandStack lastObject];
    if (operandObject) [self.operandStack removeLastObject];
    return [operandObject doubleValue];
}

//Create pushOperand getter
- (void) pushOperand:(double)operand {
    NSNumber *operandObject = [NSNumber numberWithDouble:operand];
    [self.operandStack addObject:operandObject];
}

- (double) performOperation:(NSString *)operation {
    
    double result = 0;
    
    //performs the operation here, store answer in result.
    if ([operation isEqualToString:@"+"]) {
        result = [self popOperand] + [self popOperand];
    } else if ([@"*" isEqualToString:operation]) {
        result = [self popOperand] * [self popOperand];
    } else if ([operation isEqualToString:@"-"]) {
        double subtrahend = [self popOperand];
        result = [self popOperand] - subtrahend;
    }  else if ([operation isEqualToString:@"/"]) {
        double divisor = [self popOperand];
        if (divisor) result = [self popOperand] / divisor;
    }  else if([operation isEqualToString:@"sin"]) {
        result = sin([self popOperand]);
    }  else if([operation isEqualToString:@"cos"]) {
        result = cos([self popOperand]);
    }  else if([operation isEqualToString:@"sqrt"]) {
        result = sqrt([self popOperand]);
    }  else if([operation isEqualToString:@"π"]) {
        double value = [self popOperand];
            if (value > 0.0) {
                result = value * M_PI;
            } else {
               result = M_PI; 
            }
    }
    
    
    [self pushOperand:result];
    
    
    return result;
}
@end
